import { describe, expect, it } from "vitest";
import { addBusinessDays, combinedOrderReadyEstimate, orderReadyEstimate, readyDayRange } from "./ready-estimate";

const timing = { productionMinDays: 3, productionMaxDays: 5, bulkThreshold: 50, bulkExtraDays: 2 };

describe("ready estimates", () => {
  it("adds bulk production time and selected delivery transit", () => {
    expect(readyDayRange(timing, 49, null)).toEqual({ min: 3, max: 5, deliveryIncluded: false });
    expect(readyDayRange(timing, 50, { min: 1, max: 2 })).toEqual({ min: 6, max: 9, deliveryIncluded: true });
  });

  it("does not invent dates when staff has not set production time", () => {
    expect(readyDayRange({ ...timing, productionMinDays: null }, 10, null)).toBeNull();
  });

  it("skips weekends when turning business days into dates", () => {
    expect(addBusinessDays(new Date(2026, 9, 2), 1).getDate()).toBe(5);
    expect(addBusinessDays(new Date(2026, 9, 2), 3).getDate()).toBe(7);
  });

  it("returns an arrival range for a completed delivery order", () => {
    expect(orderReadyEstimate(timing, 50, "delivery", { min: 1, max: 2 }, "2026-10-05")).toEqual({ minDate: "2026-10-13", maxDate: "2026-10-16", kind: "delivery" });
    expect(orderReadyEstimate(timing, 10, "delivery", null, "2026-10-05")?.kind).toBe("production");
  });

  it("uses the slowest cart item and adds transit once", () => {
    expect(combinedOrderReadyEstimate([
      { timing, quantity: 1 },
      { timing: { ...timing, productionMinDays: 5, productionMaxDays: 7 }, quantity: 1 },
    ], "delivery", { min: 1, max: 2 }, "2026-10-05")).toEqual({ minDate: "2026-10-13", maxDate: "2026-10-16", kind: "delivery" });
  });
});
