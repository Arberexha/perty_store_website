export const orderStatuses = ["new", "in_production", "ready", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export function orderStatusLabel(status: OrderStatus, fulfillment: "pickup" | "delivery") {
  switch (status) {
    case "new": return "Order received";
    case "in_production": return "In production";
    case "ready": return fulfillment === "pickup" ? "Ready for pickup" : "Ready for delivery";
    case "shipped": return "On its way";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
  }
}

export function trackingPath(token: string) { return `/track/${token}`; }

export function trackingUrl(token: string): string | null {
  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) return null;
  try {
    const base = new URL(siteUrl);
    if (!(["http:", "https:"].includes(base.protocol)) || base.username || base.password) return null;
    return new URL(trackingPath(token), base).toString();
  } catch { return null; }
}
