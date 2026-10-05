import type { SavedDesignData } from "./saved-design";

export type ReorderCheckout = {
  quantity: number;
  variantId: string | null;
  fulfillmentMethod: "pickup" | "delivery";
  pickupLocationId: string | null;
  shippingZoneId: string | null;
  shippingAddress: string;
  customerPhone: string;
  notes: string;
};

export type ReorderDraft = { design: SavedDesignData; checkout: ReorderCheckout };
