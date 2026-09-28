import { describe, expect, it } from "vitest";
import { productOrderingError } from "./policy";

describe("online ordering policy", () => {
  const ready = { ageRestricted: false, categoryRestricted: false, status: "published", hasPricedActiveVariant: true };

  it("allows a published, priced standard product", () => {
    expect(productOrderingError(ready)).toBeNull();
  });

  it("blocks an 18+ product even if it has a price", () => {
    expect(productOrderingError({ ...ready, ageRestricted: true })).toMatch(/18\+/);
    expect(productOrderingError({ ...ready, categoryRestricted: true })).toMatch(/18\+/);
  });

  it("blocks draft and unpriced products", () => {
    expect(productOrderingError({ ...ready, status: "draft" })).toMatch(/Publish/);
    expect(productOrderingError({ ...ready, hasPricedActiveVariant: false })).toMatch(/price/);
  });
});
