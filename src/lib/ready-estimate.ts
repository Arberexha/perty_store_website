export type ReadyTiming = {
  productionMinDays: number | null;
  productionMaxDays: number | null;
  bulkThreshold: number | null;
  bulkExtraDays: number | null;
};

export function readyDayRange(timing: ReadyTiming, quantity: number, transit: { min: number | null; max: number | null } | null) {
  if (timing.productionMinDays === null || timing.productionMaxDays === null) return null;
  const bulk = timing.bulkThreshold !== null && timing.bulkExtraDays !== null && quantity >= timing.bulkThreshold ? timing.bulkExtraDays : 0;
  const production = { min: timing.productionMinDays + bulk, max: timing.productionMaxDays + bulk };
  if (!transit || transit.min === null || transit.max === null) return { ...production, deliveryIncluded: false };
  return { min: production.min + transit.min, max: production.max + transit.max, deliveryIncluded: true };
}

export function addBusinessDays(start: Date, count: number): Date {
  const date = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  let remaining = count;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining--;
  }
  return date;
}

export type OrderReadyEstimate = {
  minDate: string;
  maxDate: string;
  kind: "pickup" | "delivery" | "production";
};

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function orderReadyEstimate(timing: ReadyTiming, quantity: number, fulfillment: "pickup" | "delivery", transit: { min: number | null; max: number | null } | null, orderDate: string): OrderReadyEstimate | null {
  const range = readyDayRange(timing, quantity, fulfillment === "delivery" ? transit : null);
  if (!range) return null;
  const [year, month, day] = orderDate.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  return {
    minDate: localDateString(addBusinessDays(start, range.min)),
    maxDate: localDateString(addBusinessDays(start, range.max)),
    kind: fulfillment === "pickup" ? "pickup" : range.deliveryIncluded ? "delivery" : "production",
  };
}
