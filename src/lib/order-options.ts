import "server-only";
import { getPool } from "@/lib/db";
import type { PriceTier } from "@/lib/order-pricing";

export type OrderVariant = { id: string; label: string; size: string; material: string; color: string; base_price_cents: number; tiers: PriceTier[] };
export type PickupOption = { id: string; name: string; address: string; opening_hours: string };
export type ShippingOption = { id: string; name: string; description: string; fee_cents: number };
export type OrderOptions = { variants: OrderVariant[]; pickup: PickupOption[]; shipping: ShippingOption[] };

export async function orderOptions(productId: string): Promise<OrderOptions> {
  const db = getPool();
  const [variants, tiers, pickup, shipping] = await Promise.all([
    db.query<Omit<OrderVariant, "tiers">>("SELECT id,label,size,material,color,base_price_cents FROM product_variants WHERE product_id=$1 AND active=true AND base_price_cents IS NOT NULL ORDER BY created_at,label", [productId]),
    db.query<PriceTier & { variant_id: string }>("SELECT t.variant_id,t.minimum_quantity,t.unit_price_cents FROM quantity_price_tiers t JOIN product_variants v ON v.id=t.variant_id WHERE v.product_id=$1 ORDER BY t.minimum_quantity", [productId]),
    db.query<PickupOption>("SELECT id,name,address,opening_hours FROM pickup_locations WHERE active=true ORDER BY name"),
    db.query<ShippingOption>("SELECT id,name,description,fee_cents FROM shipping_zones WHERE active=true ORDER BY name"),
  ]);
  return {
    variants: variants.rows.map((variant) => ({ ...variant, tiers: tiers.rows.filter((tier) => tier.variant_id === variant.id).map(({ minimum_quantity, unit_price_cents }) => ({ minimum_quantity, unit_price_cents })) })),
    pickup: pickup.rows,
    shipping: shipping.rows,
  };
}
