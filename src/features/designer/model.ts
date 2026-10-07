export const WIDTH = 1000;
export const HEIGHT = 420;
export type Product = "pens" | "shirts" | "hats" | "lighters";
export type ShirtSide = "front" | "back";
export type ShirtTool = "templates" | "product" | "text" | "upload" | "art" | "personalize" | "layers";
export type Personalization = { name: string; number: string; size: string };
export const photoSources: Record<Product, string> = {
  pens: "/images/studio-pen-photo.png",
  shirts: "/images/studio-shirt-model.png",
  hats: "/images/studio-hat-photo.png",
  lighters: "/images/studio-lighter-photo.png",
};
export const products: Record<Product, { name: string; singular: string; print: { left: number; top: number; right: number; bottom: number }; colors: { name: string; value: string }[] }> = {
  pens: { name: "Pens", singular: "pen", print: { left: 225, top: 180, right: 780, bottom: 215 }, colors: [
    { name: "White", value: "#f4f1e9" }, { name: "Cream", value: "#e6d9b6" }, { name: "Forest", value: "#244c3d" }, { name: "Navy", value: "#263c57" }, { name: "Royal blue", value: "#3869ad" }, { name: "Black", value: "#292b29" }, { name: "Terracotta", value: "#a94f3e" },
  ] },
  shirts: { name: "T-shirts", singular: "T-shirt", print: { left: 390, top: 110, right: 610, bottom: 330 }, colors: [
    { name: "White", value: "#f4f1e9" }, { name: "Cream", value: "#dfd1b6" }, { name: "Ash", value: "#c8c9c7" }, { name: "Charcoal", value: "#52565a" }, { name: "Black", value: "#292b29" },
    { name: "Navy", value: "#263c57" }, { name: "Royal blue", value: "#3869ad" }, { name: "Sky blue", value: "#79add3" }, { name: "Teal", value: "#278b92" },
    { name: "Forest", value: "#244c3d" }, { name: "Kelly green", value: "#34824b" }, { name: "Olive", value: "#737c4a" }, { name: "Yellow", value: "#e9c84b" },
    { name: "Orange", value: "#df7734" }, { name: "Red", value: "#c9393b" }, { name: "Maroon", value: "#702e43" }, { name: "Purple", value: "#684c83" }, { name: "Pink", value: "#d985a6" },
  ] },
  hats: { name: "Hats", singular: "hat", print: { left: 397, top: 95, right: 603, bottom: 245 }, colors: [
    { name: "Cream", value: "#e6d9b6" }, { name: "Forest", value: "#244c3d" }, { name: "Navy", value: "#263c57" }, { name: "Black", value: "#292b29" }, { name: "Terracotta", value: "#a94f3e" },
  ] },
  lighters: { name: "Lighters", singular: "lighter", print: { left: 438, top: 112, right: 560, bottom: 355 }, colors: [
    { name: "White", value: "#f4f1e9" }, { name: "Cream", value: "#e6d9b6" }, { name: "Forest", value: "#244c3d" }, { name: "Navy", value: "#263c57" }, { name: "Black", value: "#292b29" }, { name: "Terracotta", value: "#a94f3e" },
  ] },
};
export const productLinks: Product[] = ["pens", "shirts", "hats", "lighters"];

export type BaseLayer = { id: string; x: number; y: number; scale: number; rotation: number; side?: ShirtSide };
export type TextLayer = BaseLayer & { kind: "text"; text: string; color: string; font: "Arial" | "Georgia" | "PertySharpSans"; outlineColor?: string; outlineWidth?: number; curve?: number };
export type ImageLayer = BaseLayer & { kind: "image"; src: string; aspect: number };
export type Layer = TextLayer | ImageLayer;
export type DragState = { id: string; dx: number; dy: number; startX: number; startY: number; moved: boolean };
export type DraftSnapshot = { layers: Layer[]; color: string; selectedId: string | null; side: ShirtSide; personalizations: Personalization[]; colorVariants: string[] };

export const shirtSides: { id: ShirtSide; label: string }[] = [
  { id: "front", label: "Front" }, { id: "back", label: "Back" },
];
export const artIcons = [
  { id: "star", name: "Star", path: "M50 5 61 37 95 38 68 58 78 91 50 72 22 91 32 58 5 38 39 37Z" },
  { id: "heart", name: "Heart", path: "M50 88 13 53C-2 39 4 13 25 11c11-1 19 5 25 14 6-9 14-15 25-14 21 2 27 28 12 42Z" },
  { id: "bolt", name: "Lightning", path: "M56 3 16 54h30l-6 43 44-57H53Z" },
  { id: "shield", name: "Shield", path: "M50 5 88 19v29c0 24-14 40-38 48C26 88 12 72 12 48V19Z" },
  { id: "flower", name: "Flower", path: "M50 13c9-18 29-8 22 11 20-8 31 10 14 23 17 13 6 31-14 23 7 19-13 29-22 11-9 18-29 8-22-11-20 8-31-10-14-23-17-13-6-31 14-23C21 5 41-5 50 13Zm0 25a12 12 0 1 0 0 24 12 12 0 0 0 0-24Z" },
  { id: "mountain", name: "Mountain", path: "M4 87 35 18l20 38 11-20 30 51ZM35 48 24 72h22Z" },
] as const;

export function printArea(product: Product, side: ShirtSide) {
  if (product !== "shirts") return products[product].print;
  if (side === "back") return { left: 390, top: 95, right: 610, bottom: 325 };
  return products.shirts.print;
}

export const initialLayers: Layer[] = [
  { id: "starter", kind: "text", text: "YOUR IDEA", color: "#183c30", font: "Arial", x: 490, y: 210, scale: 1, rotation: 0 },
];
