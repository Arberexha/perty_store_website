import type { OrderReadyEstimate } from "./ready-estimate";

export const ORDER_ANNOUNCEMENT_KEY = "perty-latest-order-announcement";
export const ORDER_ANNOUNCEMENT_EVENT = "perty-order-placed";

export type OrderAnnouncement = {
  id: string;
  trackingPath: string | null;
  readyEstimate: OrderReadyEstimate | null;
};
