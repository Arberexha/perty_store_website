import { z } from "zod";
import { designRequestSchema } from "@/lib/design-request";

export const customerOrderSchema = designRequestSchema.extend({
  customerPhone: z.string().trim().min(5).max(40),
  variantId: z.string().min(1).max(100),
  fulfillmentMethod: z.enum(["pickup", "delivery"]),
  pickupLocationId: z.string().max(100).nullable(),
  shippingZoneId: z.string().max(100).nullable(),
  shippingAddress: z.string().trim().max(500),
  expectedTotalCents: z.number().int().min(0).max(1_000_000_000),
  confirmed: z.literal(true),
}).refine((order) => order.fulfillmentMethod !== "delivery" || Boolean(order.shippingZoneId && order.shippingAddress.length >= 10), {
  message: "Choose a delivery zone and enter your full address",
});

export type CustomerOrderInput = z.infer<typeof customerOrderSchema>;
