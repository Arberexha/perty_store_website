import { z } from "zod";
import { decodeDesignImage } from "@/lib/design-request";

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const side = z.enum(["front", "back"]);
const base = { id: z.string().min(1).max(100), x: z.number().finite().min(0).max(1000), y: z.number().finite().min(0).max(420), scale: z.number().finite().min(.1).max(4), rotation: z.number().finite().min(-360).max(360), side: side.optional() };
const textLayer = z.object({ ...base, kind: z.literal("text"), text: z.string().max(32), color, font: z.enum(["Arial", "Georgia", "PertySharpSans"]), outlineColor: color.optional(), outlineWidth: z.number().finite().min(0).max(8).optional(), curve: z.number().finite().min(-100).max(100).optional() }).strict();
const imageLayer = z.object({ ...base, kind: z.literal("image"), src: z.string().max(1_500_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/), aspect: z.number().finite().positive().max(100) }).strict();

export const savedDesignSchema = z.object({
  id: z.uuid().optional(),
  productId: z.string().min(1).max(100),
  name: z.string().trim().min(1).max(120),
  design: z.object({
    productColor: color,
    shirtSide: side,
    layers: z.array(z.discriminatedUnion("kind", [textLayer, imageLayer])).max(20),
    personalizations: z.array(z.object({ name: z.string().max(40), number: z.string().max(8), size: z.string().max(12) }).strict()).max(100),
    colorVariants: z.array(color).max(12),
  }).strict(),
  previewPng: z.string().max(3_000_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
}).strict();

export type SavedDesignData = z.infer<typeof savedDesignSchema>["design"];

export function validateSavedAssets(input: z.infer<typeof savedDesignSchema>): Buffer | null {
  if (input.design.layers.some((layer) => layer.kind === "image" && !decodeDesignImage(layer.src))) return null;
  const bytes = Buffer.from(input.previewPng.slice("data:image/png;base64,".length), "base64");
  return bytes.length >= 100 && bytes.length <= 2_000_000 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? bytes : null;
}
