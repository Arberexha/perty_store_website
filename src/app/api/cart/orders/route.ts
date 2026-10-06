import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasValidOrigin } from "@/lib/auth/origin";
import { cartOrderSchema } from "@/lib/cart-order";
import { validatedDesignAssets } from "@/lib/design-request";
import { getPool } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import type { OrderConfirmation, OrderConfirmationItem } from "@/lib/email/order-confirmation";
import { orderTotal } from "@/lib/order-pricing";
import type { PriceTier } from "@/lib/order-pricing";
import { combinedOrderReadyEstimate } from "@/lib/ready-estimate";
import type { ReadyTiming } from "@/lib/ready-estimate";
import { trackingPath, trackingUrl } from "@/lib/order-tracking";

const MAX_BODY_BYTES = 30_000_000;
class CartOrderError extends Error { constructor(message: string, public status = 400) { super(message); } }

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ error: "Cart artwork is too large" }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "Cart artwork is too large" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid cart order" }, { status: 400 }); }
  const parsed = cartOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the designs, contact details, and delivery choice" }, { status: 400 });
  const input = parsed.data;
  const previews = input.items.map((item) => {
    if (item.personalizations?.length && item.personalizations.length !== item.quantity) return { preview: undefined, error: "A personalized shirt quantity does not match its roster" };
    return validatedDesignAssets({ ...item, customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, notes: input.notes });
  });
  const invalid = previews.find((item) => !item.preview);
  if (invalid) return NextResponse.json({ error: invalid.error }, { status: 400 });

  const user = await getCurrentUser();
  const id = randomUUID();
  let confirmation: OrderConfirmation;
  let trackingToken = "";
  let readyEstimate = null;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const prepared: Array<{ input: typeof input.items[number]; product: { id: string; name: string; photo_mockup: boolean }; variant: { id: string; label: string }; price: ReturnType<typeof orderTotal>; timing: ReadyTiming; preview: Buffer }> = [];
    let subtotal = 0;
    for (const [index, item] of input.items.entries()) {
      const found = await client.query<{ id: string; name: string; design_template: string; status: string; ordering_enabled: boolean; age_restricted: boolean; category_restricted: boolean; minimum_quantity: number; photo_mockup: boolean; production_min_days: number | null; production_max_days: number | null; bulk_threshold: number | null; bulk_extra_days: number | null }>(
        `SELECT p.id,p.name,p.design_template,p.status,p.ordering_enabled,p.age_restricted,c.age_restricted AS category_restricted,p.minimum_quantity,p.production_min_days,p.production_max_days,p.bulk_threshold,p.bulk_extra_days,(p.mockup_image IS NOT NULL) AS photo_mockup
         FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=$1 FOR SHARE OF p`, [item.catalogProductId]);
      const product = found.rows[0];
      if (!product || product.status !== "published" || !product.ordering_enabled || product.age_restricted || product.category_restricted || product.design_template !== item.product) throw new CartOrderError(`Item ${index + 1} is no longer available for ordering`, 409);
      if (item.quantity < product.minimum_quantity) throw new CartOrderError(`Item ${index + 1} requires at least ${product.minimum_quantity} pieces`, 409);
      const variants = await client.query<{ id: string; label: string; base_price_cents: number }>("SELECT id,label,base_price_cents FROM product_variants WHERE id=$1 AND product_id=$2 AND active=true AND base_price_cents IS NOT NULL FOR SHARE", [item.variantId, product.id]);
      const variant = variants.rows[0];
      if (!variant) throw new CartOrderError(`Item ${index + 1} has an unavailable product option. Refresh the cart and choose another.`, 409);
      const tiers = await client.query<PriceTier>("SELECT minimum_quantity,unit_price_cents FROM quantity_price_tiers WHERE variant_id=$1", [variant.id]);
      const price = orderTotal(variant.base_price_cents, tiers.rows, item.quantity, 0);
      subtotal += price.subtotalCents;
      prepared.push({ input: item, product, variant, price, timing: { productionMinDays: product.production_min_days, productionMaxDays: product.production_max_days, bulkThreshold: product.bulk_threshold, bulkExtraDays: product.bulk_extra_days }, preview: previews[index].preview! });
    }
    let pickupLocationId: string | null = null;
    let shippingZoneId: string | null = null;
    let shippingAddress: string | null = null;
    let shippingCents = 0;
    let transit: { min: number | null; max: number | null } | null = null;
    let fulfillmentDetail = "Arrange pickup with the shop";
    if (input.fulfillmentMethod === "pickup") {
      if (input.pickupLocationId) {
        const pickup = await client.query<{ name: string; address: string; opening_hours: string }>("SELECT name,address,opening_hours FROM pickup_locations WHERE id=$1 AND active=true FOR SHARE", [input.pickupLocationId]);
        if (!pickup.rows[0]) throw new CartOrderError("Pickup location is no longer available", 409);
        pickupLocationId = input.pickupLocationId;
        fulfillmentDetail = `${pickup.rows[0].name}, ${pickup.rows[0].address}${pickup.rows[0].opening_hours ? ` (${pickup.rows[0].opening_hours})` : ""}`;
      }
    } else {
      const zone = await client.query<{ name: string; fee_cents: number; transit_min_days: number | null; transit_max_days: number | null }>("SELECT name,fee_cents,transit_min_days,transit_max_days FROM shipping_zones WHERE id=$1 AND active=true FOR SHARE", [input.shippingZoneId]);
      if (!zone.rows[0]) throw new CartOrderError("Delivery zone is no longer available", 409);
      shippingZoneId = input.shippingZoneId;
      shippingAddress = input.shippingAddress;
      shippingCents = zone.rows[0].fee_cents;
      transit = { min: zone.rows[0].transit_min_days, max: zone.rows[0].transit_max_days };
      fulfillmentDetail = `${input.shippingAddress} (${zone.rows[0].name})`;
    }
    const total = subtotal + shippingCents;
    if (total > 2_147_483_647) throw new CartOrderError("Order total is too large");
    if (total !== input.expectedTotalCents) throw new CartOrderError("The cart price changed. Refresh the page and review the total before ordering.", 409);
    readyEstimate = combinedOrderReadyEstimate(prepared.map((item) => ({ timing: item.timing, quantity: item.input.quantity })), input.fulfillmentMethod, transit, new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Belgrade", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()));
    const inserted = await client.query<{ tracking_token: string }>(`INSERT INTO orders
      (id,user_id,customer_name,customer_email,customer_phone,customer_note,fulfillment_method,pickup_location_id,shipping_address,shipping_zone_id,subtotal_cents,shipping_cents,total_cents,confirmation_email_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending') RETURNING tracking_token`, [
      id, user?.id ?? null, input.customerName, input.customerEmail.toLowerCase(), input.customerPhone, input.notes,
      input.fulfillmentMethod, pickupLocationId, shippingAddress, shippingZoneId, subtotal, shippingCents, total,
    ]);
    trackingToken = inserted.rows[0].tracking_token;
    for (const item of prepared) {
      await client.query(`INSERT INTO order_items
        (id,order_id,product_id,variant_id,product_name,variant_label,quantity,unit_price_cents,line_total_cents,design_data,preview_png)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [randomUUID(), id, item.product.id, item.variant.id, item.product.name, item.variant.label, item.input.quantity,
        item.price.unitPriceCents, item.price.subtotalCents,
        JSON.stringify({ layers: item.input.layers, personalizations: item.input.personalizations ?? [], previewSide: item.input.previewSide ?? "front", previewHeight: item.input.previewHeight ?? 420, productColors: item.input.productColors ?? [item.input.productColor], productColor: item.input.productColor, photoMockup: item.product.photo_mockup }), item.preview]);
    }
    const emailItems: OrderConfirmationItem[] = prepared.map((item) => ({ productName: item.product.name, variantLabel: item.variant.label, quantity: item.input.quantity, unitPriceCents: item.price.unitPriceCents, lineTotalCents: item.price.subtotalCents, productColor: item.input.productColor, personalizations: item.input.personalizations ?? [], previewPng: item.preview }));
    const first = emailItems[0];
    confirmation = { id, customerName: input.customerName, customerEmail: input.customerEmail.toLowerCase(), productName: first.productName, variantLabel: first.variantLabel, quantity: first.quantity,
      unitPriceCents: first.unitPriceCents, subtotalCents: subtotal, shippingCents, totalCents: total, fulfillmentMethod: input.fulfillmentMethod, fulfillmentDetail,
      customerNote: input.notes, productColor: first.productColor, personalizations: first.personalizations, previewPng: first.previewPng, items: emailItems, trackingUrl: trackingUrl(trackingToken) };
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof CartOrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Cart order creation failed", error);
    return NextResponse.json({ error: "Could not place the cart order. Please try again." }, { status: 500 });
  } finally { client.release(); }
  let emailStatus: "sent" | "failed" | "not_configured";
  try { emailStatus = await sendOrderConfirmation(confirmation); }
  catch (error) { emailStatus = "failed"; console.error("Cart order confirmation email failed", { orderId: id, error }); }
  try { await getPool().query("UPDATE orders SET confirmation_email_status=$2,confirmation_email_sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1", [id, emailStatus]); }
  catch (error) { console.error("Could not record cart order email status", { orderId: id, error }); }
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  return NextResponse.json({ id, totalCents: confirmation.totalCents, emailStatus, trackingPath: trackingPath(trackingToken), readyEstimate }, { status: 201 });
}
