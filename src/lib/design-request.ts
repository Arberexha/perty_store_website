import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const layerBase = {
  id: z.string().min(1).max(100),
  x: z.number().finite().min(0).max(1000),
  y: z.number().finite().min(0).max(420),
  scale: z.number().finite().min(0.4).max(2),
  rotation: z.number().finite().min(-60).max(60),
  side: z.enum(["front", "left-chest", "back", "left-sleeve", "right-sleeve"]).optional(),
};
const textLayer = z.object({ ...layerBase, kind: z.literal("text"), text: z.string().trim().min(1).max(32), color: hexColor, font: z.enum(["Arial", "Georgia", "PertySharpSans"]), outlineColor: hexColor.optional(), outlineWidth: z.number().finite().min(0).max(8).optional(), curve: z.number().finite().min(-100).max(100).optional() }).strict();
const imageLayer = z.object({ ...layerBase, kind: z.literal("image"), src: z.string().max(1_500_000).regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/), aspect: z.number().finite().positive().max(100) }).strict();

export const designRequestSchema = z.object({
  product: z.enum(["pens", "shirts", "hats"]),
  catalogProductId: z.string().min(1).max(100),
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.email().max(254),
  customerPhone: z.string().trim().max(40).default(""),
  quantity: z.number().int().min(1).max(1000),
  notes: z.string().trim().max(2000).default(""),
  productColor: hexColor,
  layers: z.array(z.discriminatedUnion("kind", [textLayer, imageLayer])).min(1).max(20),
  personalizations: z.array(z.object({ name: z.string().trim().max(40), number: z.string().trim().max(8), size: z.string().trim().max(12) }).strict()).max(100).optional(),
  previewSide: z.enum(["front", "left-chest", "back", "left-sleeve", "right-sleeve", "overview"]).optional(),
  previewHeight: z.number().int().min(210).max(630).optional(),
  productColors: z.array(hexColor).min(1).max(13).optional(),
  previewPng: z.string().max(3_000_000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
}).strict();

export type DesignRequestInput = z.infer<typeof designRequestSchema>;

export function validatedDesignAssets(input: DesignRequestInput): { preview: Buffer; error?: never } | { preview?: never; error: string } {
  if (input.layers.some((layer) => layer.kind === "image" && !decodeDesignImage(layer.src))) {
    return { error: "An uploaded image could not be saved. Please use a PNG, JPG, or WebP file under 1 MB." };
  }
  const preview = Buffer.from(input.previewPng.slice("data:image/png;base64,".length), "base64");
  if (preview.length < 100 || preview.length > 2_000_000 || !preview.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { error: "The design preview could not be saved. Try downloading it first." };
  }
  return { preview };
}

export function decodeDesignImage(source: string): { mimeType: "image/png" | "image/jpeg" | "image/webp"; bytes: Buffer } | null {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(source);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 1_000_000) return null;
  const mimeType = match[1] as "image/png" | "image/jpeg" | "image/webp";
  const valid = mimeType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : mimeType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  return valid ? { mimeType, bytes } : null;
}
