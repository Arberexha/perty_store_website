import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasValidOrigin } from "@/lib/auth/origin";
import { customerOrderSchema } from "@/lib/customer-order";
import { validatedDesignAssets } from "@/lib/design-request";
import { getPool } from "@/lib/db";
import { sendOrderConfirmation } from "@/lib/email/order-confirmation";
import type { OrderConfirmation } from "@/lib/email/order-confirmation";
import { orderTotal } from "@/lib/order-pricing";
import type { PriceTier } from "@/lib/order-pricing";

const MAX_BODY_BYTES = 8_000_000;

class OrderError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ error: "Design is too large to submit" }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "Design is too large to submit" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Invalid order" }, { status: 400 }); }
  const parsed = customerOrderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your contact details, delivery choice, and design" }, { status: 400 });
  const input = parsed.data;
  if (input.personalizations?.length && input.personalizations.length !== input.quantity) {
    return NextResponse.json({ error: "Quantity must match the number of personalized shirts" }, { status: 400 });
  }
  const assets = validatedDesignAssets(input);
  if (!assets.preview) return NextResponse.json({ error: assets.error }, { status: 400 });

  const user = await getCurrentUser();
  const id = randomUUID();
  let confirmation: OrderConfirmation;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const productResult = await client.query<{ id: string; name: string; design_template: string; status: string; ordering_enabled: boolean; age_restricted: boolean; category_restricted: boolean; minimum_quantity: number; photo_mockup: boolean }>(
      `SELECT p.id,p.name,p.design_template,p.status,p.ordering_enabled,p.age_restricted,c.age_restricted AS category_restricted,p.minimum_quantity,(p.mockup_image IS NOT NULL) AS photo_mockup
       FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=$1 FOR SHARE OF p`, [input.catalogProductId],
    );
    const product = productResult.rows[0];
    if (!product || product.status !== "published" || !product.ordering_enabled || product.age_restricted || product.category_restricted || product.design_template !== input.product) {
      throw new OrderError("This product is not available for online orders");
    }
    if (input.quantity < product.minimum_quantity) throw new OrderError(`Minimum quantity is ${product.minimum_quantity}`);

    const variantResult = await client.query<{ id: string; label: string; base_price_cents: number }>(
      "SELECT id,label,base_price_cents FROM product_variants WHERE id=$1 AND product_id=$2 AND active=true AND base_price_cents IS NOT NULL FOR SHARE",
      [input.variantId, product.id],
    );
    const variant = variantResult.rows[0];
    if (!variant) throw new OrderError("This product option is no longer available");
    const tiers = await client.query<PriceTier>("SELECT minimum_quantity,unit_price_cents FROM quantity_price_tiers WHERE variant_id=$1", [variant.id]);

    let pickupLocationId: string | null = null;
    let shippingZoneId: string | null = null;
    let shippingAddress: string | null = null;
    let shippingCents = 0;
    let fulfillmentDetail = "Arrange pickup with the shop";
    if (input.fulfillmentMethod === "pickup") {
      if (input.pickupLocationId) {
        const pickup = await client.query<{ name: string; address: string; opening_hours: string }>("SELECT name,address,opening_hours FROM pickup_locations WHERE id=$1 AND active=true FOR SHARE", [input.pickupLocationId]);
        if (!pickup.rows[0]) throw new OrderError("Pickup location is no longer available");
        pickupLocationId = input.pickupLocationId;
        fulfillmentDetail = `${pickup.rows[0].name}, ${pickup.rows[0].address}${pickup.rows[0].opening_hours ? ` (${pickup.rows[0].opening_hours})` : ""}`;
      }
    } else {
      const zone = await client.query<{ name: string; fee_cents: number }>("SELECT name,fee_cents FROM shipping_zones WHERE id=$1 AND active=true FOR SHARE", [input.shippingZoneId]);
      if (!zone.rows[0]) throw new OrderError("Delivery zone is no longer available");
      shippingZoneId = input.shippingZoneId;
      shippingAddress = input.shippingAddress;
      shippingCents = zone.rows[0].fee_cents;
      fulfillmentDetail = `${input.shippingAddress} (${zone.rows[0].name})`;
    }

    const price = orderTotal(variant.base_price_cents, tiers.rows, input.quantity, shippingCents);
    if (price.totalCents > 2_147_483_647) throw new OrderError("Order total is too large");
    if (price.totalCents !== input.expectedTotalCents) throw new OrderError("The price changed. Refresh the page and review the total before ordering.", 409);

    await client.query(`INSERT INTO orders
      (id,user_id,customer_name,customer_email,customer_phone,customer_note,fulfillment_method,pickup_location_id,shipping_address,shipping_zone_id,subtotal_cents,shipping_cents,total_cents,confirmation_email_status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending')`, [
      id, user?.id ?? null, input.customerName, input.customerEmail.toLowerCase(), input.customerPhone,
      input.notes, input.fulfillmentMethod, pickupLocationId, shippingAddress, shippingZoneId,
      price.subtotalCents, price.shippingCents, price.totalCents,
    ]);
    await client.query(`INSERT INTO order_items
      (id,order_id,product_id,variant_id,product_name,variant_label,quantity,unit_price_cents,line_total_cents,design_data,preview_png)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
      randomUUID(), id, product.id, variant.id, product.name, variant.label, input.quantity,
      price.unitPriceCents, price.subtotalCents,
      JSON.stringify({ layers: input.layers, personalizations: input.personalizations ?? [], previewSide: input.previewSide ?? "front", previewHeight: input.previewHeight ?? 420, productColors: input.productColors ?? [input.productColor], productColor: input.productColor, photoMockup: product.photo_mockup }),
      assets.preview,
    ]);
    confirmation = { id, customerName: input.customerName, customerEmail: input.customerEmail.toLowerCase(),
      productName: product.name, variantLabel: variant.label, quantity: input.quantity,
      unitPriceCents: price.unitPriceCents, subtotalCents: price.subtotalCents,
      shippingCents: price.shippingCents, totalCents: price.totalCents,
      fulfillmentMethod: input.fulfillmentMethod, fulfillmentDetail, customerNote: input.notes,
      productColor: input.productColor, personalizations: input.personalizations ?? [], previewPng: assets.preview };
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Order creation failed", error);
    return NextResponse.json({ error: "Could not place the order. Please try again." }, { status: 500 });
  } finally {
    client.release();
  }
  let emailStatus: "sent" | "failed" | "not_configured";
  try { emailStatus = await sendOrderConfirmation(confirmation); }
  catch (error) { emailStatus = "failed"; console.error("Order confirmation email failed", { orderId: id, error }); }
  try { await getPool().query("UPDATE orders SET confirmation_email_status=$2,confirmation_email_sent_at=CASE WHEN $2='sent' THEN now() ELSE NULL END WHERE id=$1", [id, emailStatus]); }
  catch (error) { console.error("Could not record order email status", { orderId: id, error }); }
  revalidatePath("/admin/orders");
  revalidatePath("/account");
  return NextResponse.json({ id, totalCents: confirmation.totalCents, emailStatus }, { status: 201 });
}
