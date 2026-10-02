import "server-only";
import { getPool } from "@/lib/db";
import type { OrderConfirmation } from "./order-confirmation";
import { trackingUrl } from "@/lib/order-tracking";

type OrderEmailRow = {
  id: string; tracking_token: string; customer_name: string; customer_email: string; customer_note: string;
  fulfillment_method: "pickup" | "delivery"; shipping_address: string | null;
  pickup_name: string | null; pickup_address: string | null; pickup_hours: string | null;
  zone_name: string | null; subtotal_cents: number; shipping_cents: number; total_cents: number;
  product_name: string; variant_label: string; quantity: number; unit_price_cents: number;
  design_data: { productColor?: string; personalizations?: OrderConfirmation["personalizations"] } | null;
  preview_png: Buffer | null;
};

export async function loadOrderEmailDetails(id: string): Promise<OrderConfirmation | null> {
  const result = await getPool().query<OrderEmailRow>(`SELECT o.id,o.tracking_token,o.customer_name,o.customer_email,o.customer_note,o.fulfillment_method,o.shipping_address,
    o.subtotal_cents,o.shipping_cents,o.total_cents,
    l.name AS pickup_name,l.address AS pickup_address,l.opening_hours AS pickup_hours,z.name AS zone_name,
    i.product_name,i.variant_label,i.quantity,i.unit_price_cents,i.design_data,i.preview_png
    FROM orders o JOIN LATERAL (SELECT * FROM order_items WHERE order_id=o.id ORDER BY id LIMIT 1) i ON true
    LEFT JOIN pickup_locations l ON l.id=o.pickup_location_id
    LEFT JOIN shipping_zones z ON z.id=o.shipping_zone_id WHERE o.id=$1`, [id]);
  const row = result.rows[0];
  if (!row) return null;
  const fulfillmentDetail = row.fulfillment_method === "delivery"
    ? `${row.shipping_address ?? "Address unavailable"}${row.zone_name ? ` (${row.zone_name})` : ""}`
    : row.pickup_name ? `${row.pickup_name}, ${row.pickup_address ?? ""}${row.pickup_hours ? ` (${row.pickup_hours})` : ""}` : "Arrange pickup with the shop";
  return {
    id: row.id, customerName: row.customer_name, customerEmail: row.customer_email,
    productName: row.product_name, variantLabel: row.variant_label, quantity: row.quantity,
    unitPriceCents: row.unit_price_cents, subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents, totalCents: row.total_cents,
    fulfillmentMethod: row.fulfillment_method, fulfillmentDetail,
    customerNote: row.customer_note, productColor: row.design_data?.productColor ?? "—",
    personalizations: Array.isArray(row.design_data?.personalizations) ? row.design_data.personalizations : [],
    previewPng: row.preview_png, trackingUrl: trackingUrl(row.tracking_token),
  };
}
