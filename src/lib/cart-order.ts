import { z } from "zod";
import { designRequestSchema } from "./design-request";
import { MAX_CART_ITEMS } from "./cart";

const cartDesignSchema = designRequestSchema.pick({
  product: true, catalogProductId: true, productColor: true, layers: true,
  personalizations: true, previewSide: true, previewHeight: true,
  productColors: true, previewPng: true,
}).extend({ variantId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(1000) }).strict();

export const cartOrderSchema = z.object({
  items: z.array(cartDesignSchema).min(1).max(MAX_CART_ITEMS),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.email().max(254),
  customerPhone: z.string().trim().min(5).max(40),
  notes: z.string().trim().max(2000),
  fulfillmentMethod: z.enum(["pickup", "delivery"]),
  pickupLocationId: z.string().max(100).nullable(),
  shippingZoneId: z.string().max(100).nullable(),
  shippingAddress: z.string().trim().max(500),
  expectedTotalCents: z.number().int().min(0).max(2_147_483_647),
  confirmed: z.literal(true),
}).strict().refine((order) => order.fulfillmentMethod !== "delivery" || Boolean(order.shippingZoneId && order.shippingAddress.length >= 10), {
  message: "Choose a delivery zone and enter your full address",
});

export type CartOrderInput = z.infer<typeof cartOrderSchema>;
