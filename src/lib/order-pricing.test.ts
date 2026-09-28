import { describe, expect, it } from "vitest";
import { orderTotal, unitPriceForQuantity } from "./order-pricing";

describe("order pricing", () => {
  const tiers = [{ minimum_quantity: 10, unit_price_cents: 850 }, { minimum_quantity: 25, unit_price_cents: 700 }];

  it("uses the highest matching quantity tier", () => {
    expect(unitPriceForQuantity(1000, tiers, 9)).toBe(1000);
    expect(unitPriceForQuantity(1000, tiers, 10)).toBe(850);
    expect(unitPriceForQuantity(1000, [...tiers].reverse(), 30)).toBe(700);
  });

  it("adds shipping after the item subtotal", () => {
    expect(orderTotal(1000, tiers, 10, 300)).toEqual({ unitPriceCents: 850, subtotalCents: 8500, shippingCents: 300, totalCents: 8800 });
  });
});
