"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guard";
import { getPool } from "@/lib/db";
import { loadOrderEmailDetails } from "@/lib/email/order-data";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";

class DecisionError extends Error {}

type QuoteRow = { id: string; status: string; amount_cents: number | null; design_request_id: string; request_status: string; product_id: string | null; product_name: string | null; product_type: string; quantity: number; design_data: unknown; preview_png: Buffer; has_proof: boolean; revision: number; customer_phone: string; notes: string; product_color: string; customer_name: string; customer_email: string };

async function decide(formData: FormData, operation: "accept" | "changes") {
  const user = await requireUser();
  const id = formData.get("id");
  const path = typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? `/account/quotes/${id}` : "/account";
  let error: string | null = null;
  let orderId: string | null = null;
  try {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new DecisionError("Invalid quote");
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      const reference = (await client.query<{ design_request_id: string }>("SELECT design_request_id FROM quotes WHERE id=$1 AND user_id=$2", [id, user.id])).rows[0];
      if (!reference?.design_request_id) throw new DecisionError("Quote not found");
      const ownedRequest = await client.query("SELECT id FROM design_requests WHERE id=$1 AND user_id=$2 FOR UPDATE", [reference.design_request_id, user.id]);
      if (!ownedRequest.rowCount) throw new DecisionError("Quote not found");
      const quote = (await client.query<QuoteRow>(`SELECT q.id,q.status,q.amount_cents,q.design_request_id,q.revision,(q.proof_png IS NOT NULL) AS has_proof,r.status AS request_status,r.product_id,r.product_name,r.product_type,r.quantity,r.design_data,coalesce(q.proof_png,r.preview_png) AS preview_png,r.customer_phone,r.notes,r.product_color,r.customer_name,r.customer_email
        FROM quotes q JOIN design_requests r ON r.id=q.design_request_id WHERE q.id=$1 AND q.user_id=$2 AND r.user_id=$2 FOR UPDATE OF q`, [id, user.id])).rows[0];
      if (!quote) throw new DecisionError("Quote not found");
      if (Number(formData.get("revision")) !== quote.revision) throw new DecisionError("The quote changed. Refresh and review the latest offer.");
      if (quote.status !== "sent" || quote.request_status !== "quoted") throw new DecisionError("This quote is no longer awaiting your decision");
      if (operation === "changes") {
        const note = formData.get("note");
        if (typeof note !== "string" || note.trim().length < 5 || note.trim().length > 2000) throw new DecisionError("Describe the changes you need (at least 5 characters)");
        await client.query("UPDATE quotes SET status='changes_requested',customer_note=$2,responded_at=now(),updated_at=now() WHERE id=$1", [id, note.trim()]);
        await client.query("UPDATE design_requests SET status='reviewing',updated_at=now() WHERE id=$1", [quote.design_request_id]);
      } else {
        if (!quote.amount_cents || quote.amount_cents <= 0 || quote.amount_cents % quote.quantity !== 0) throw new DecisionError("This quote needs a valid per-item breakdown");
        const method = formData.get("fulfillment_method");
        if (method !== "pickup" && method !== "delivery") throw new DecisionError("Choose pickup or delivery");
        let pickupId: string | null = null;
        let zoneId: string | null = null;
        let address: string | null = null;
        let shippingCents = 0;
        if (method === "pickup") {
          const requested = formData.get("pickup_location_id");
          if (typeof requested === "string" && requested) {
            const pickup = await client.query("SELECT id FROM pickup_locations WHERE id=$1 AND active=true FOR SHARE", [requested]);
            if (!pickup.rowCount) throw new DecisionError("Pickup location is no longer available");
            pickupId = requested;
          }
        } else {
          const requested = formData.get("shipping_zone_id");
          const enteredAddress = formData.get("shipping_address");
          if (typeof requested !== "string" || !requested) throw new DecisionError("Choose a delivery zone");
          if (typeof enteredAddress !== "string" || enteredAddress.trim().length < 5 || enteredAddress.trim().length > 500) throw new DecisionError("Enter a delivery address");
          const zone = (await client.query<{ fee_cents: number }>("SELECT fee_cents FROM shipping_zones WHERE id=$1 AND active=true FOR SHARE", [requested])).rows[0];
          if (!zone) throw new DecisionError("Delivery zone is no longer available");
          zoneId = requested;
          address = enteredAddress.trim();
          shippingCents = zone.fee_cents;
        }
        if (Number(formData.get("expected_shipping_cents")) !== shippingCents) throw new DecisionError("The delivery fee changed. Refresh and review the total.");
        const totalCents = quote.amount_cents + shippingCents;
        if (totalCents > 2_147_483_647) throw new DecisionError("Order total is too large");
        orderId = randomUUID();
        await client.query(`INSERT INTO orders (id,user_id,customer_name,customer_email,customer_phone,customer_note,fulfillment_method,pickup_location_id,shipping_address,shipping_zone_id,subtotal_cents,shipping_cents,total_cents,confirmation_email_status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')`, [orderId, user.id, quote.customer_name, user.email, quote.customer_phone, quote.notes, method, pickupId, address, zoneId, quote.amount_cents, shippingCents, totalCents]);
        await client.query(`INSERT INTO order_items (id,order_id,product_id,product_name,variant_label,quantity,unit_price_cents,line_total_cents,design_data,preview_png)
          VALUES ($1,$2,$3,$4,'Custom quote',$5,$6,$7,$8,$9)`, [randomUUID(), orderId, quote.product_id, quote.product_name ?? quote.product_type, quote.quantity, quote.amount_cents / quote.quantity, quote.amount_cents, JSON.stringify({ ...(quote.design_data as object), productColor: quote.product_color, quoteRevision: quote.revision, quoteProof: quote.has_proof }), quote.preview_png]);
        await client.query("UPDATE quotes SET status='accepted',order_id=$2,responded_at=now(),updated_at=now() WHERE id=$1", [id, orderId]);
        await client.query("UPDATE design_requests SET status='closed',updated_at=now() WHERE id=$1", [quote.design_request_id]);
      }
      await client.query("COMMIT");
    } catch (cause) { await client.query("ROLLBACK"); throw cause; }
    finally { client.release(); }
  } catch (cause) { error = cause instanceof DecisionError ? cause.message : "Could not save your decision"; if (!(cause instanceof DecisionError)) console.error("Quote decision failed", cause); }
  if (error) redirect(`${path}?error=${encodeURIComponent(error)}`);
  if (orderId) {
    let status: "sent" | "failed" | "not_configured";
    try { const order = await loadOrderEmailDetails(orderId); status = order ? await sendOrderConfirmation(order) : "failed"; }
    catch (cause) { status = "failed"; console.error("Quote order confirmation failed", { orderId, cause }); }
    await getPool().query("UPDATE orders SET confirmation_email_status=$2,confirmation_email_sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1", [orderId, status]);
  }
  revalidatePath("/account");
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/design-requests");
  revalidatePath("/admin/orders");
  redirect(`${path}?${operation === "accept" ? "accepted" : "changes"}=1`);
}

export async function acceptQuote(formData: FormData) { await decide(formData, "accept"); }
export async function requestQuoteChanges(formData: FormData) { await decide(formData, "changes"); }
