import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";
import { savedDesignSchema } from "@/lib/saved-design";
import type { ReorderCheckout } from "@/lib/reorder";

type OrderItem = {
  product_id: string | null;
  design_data: Record<string, unknown> | null;
  quantity: number;
  variant_id: string | null;
  fulfillment_method: "pickup" | "delivery";
  pickup_location_id: string | null;
  shipping_zone_id: string | null;
  shipping_address: string | null;
  customer_phone: string;
  customer_note: string;
  product_status: string | null;
  ordering_enabled: boolean | null;
  age_restricted: boolean | null;
  category_restricted: boolean | null;
  available_variant: boolean;
};

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to reorder." }, { status: 401 });
  const { id } = await context.params;
  const result = await getPool().query<OrderItem>(`SELECT i.product_id,i.design_data,i.quantity,i.variant_id,o.fulfillment_method,o.pickup_location_id,o.shipping_zone_id,o.shipping_address,o.customer_phone,o.customer_note,
    p.status AS product_status,p.ordering_enabled,p.age_restricted,c.age_restricted AS category_restricted,
    EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.active AND v.base_price_cents IS NOT NULL) AS available_variant
    FROM orders o JOIN order_items i ON i.order_id=o.id
    LEFT JOIN products p ON p.id=i.product_id LEFT JOIN categories c ON c.id=p.category_id
    WHERE o.id=$1 AND o.user_id=$2`, [id, user.id]);
  if (result.rows.length !== 1) return NextResponse.json({ error: "Order not found or cannot be reordered." }, { status: 404 });
  const item = result.rows[0];
  if (item.product_status !== "published" || !item.ordering_enabled || item.age_restricted || item.category_restricted || !item.available_variant) {
    return NextResponse.json({ error: "This product is no longer available for ordering." }, { status: 409 });
  }
  const data = item.design_data;
  const colors = Array.isArray(data?.productColors) ? data.productColors.filter((color) => color !== data.productColor) : [];
  const parsed = savedDesignSchema.shape.design.safeParse({
    productColor: data?.productColor,
    shirtSide: data?.previewSide === "back" ? "back" : "front",
    layers: data?.layers,
    personalizations: data?.personalizations ?? [],
    colorVariants: colors,
  });
  if (!parsed.success) return NextResponse.json({ error: "The artwork for this order cannot be reopened." }, { status: 422 });
  const checkout: ReorderCheckout = {
    quantity: item.quantity,
    variantId: item.variant_id,
    fulfillmentMethod: item.fulfillment_method,
    pickupLocationId: item.pickup_location_id,
    shippingZoneId: item.shipping_zone_id,
    shippingAddress: item.shipping_address ?? "",
    customerPhone: item.customer_phone,
    notes: item.customer_note,
  };
  return NextResponse.json({ productId: item.product_id, design: parsed.data, checkout }, { headers: { "Cache-Control": "private, no-store" } });
}
