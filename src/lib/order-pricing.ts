export type PriceTier = { minimum_quantity: number; unit_price_cents: number };

export function unitPriceForQuantity(basePriceCents: number, tiers: PriceTier[], quantity: number): number {
  let price = basePriceCents;
  let threshold = 1;
  for (const tier of tiers) {
    if (tier.minimum_quantity <= quantity && tier.minimum_quantity > threshold) {
      price = tier.unit_price_cents;
      threshold = tier.minimum_quantity;
    }
  }
  return price;
}

export function orderTotal(basePriceCents: number, tiers: PriceTier[], quantity: number, shippingCents: number) {
  const unitPriceCents = unitPriceForQuantity(basePriceCents, tiers, quantity);
  const subtotalCents = unitPriceCents * quantity;
  return { unitPriceCents, subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents };
}
