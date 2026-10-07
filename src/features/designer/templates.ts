import type { PrintArea } from "@/lib/product-mockup";
import type { Product, TextLayer } from "./model";

type TemplateLine = Pick<TextLayer, "text" | "color" | "font"> & { y: number; scale: number; curve?: number };
export type StarterTemplate = { id: string; name: string; description: string; productColor: string; lines: TemplateLine[] };

export const starterTemplates: Record<Product, StarterTemplate[]> = {
  shirts: [
    { id: "birthday", name: "Birthday", description: "A bold birthday message", productColor: "#f4f1e9", lines: [
      { text: "HAPPY", color: "#fa3c00", font: "PertySharpSans", y: .27, scale: 1.2 },
      { text: "BIRTHDAY", color: "#183c30", font: "PertySharpSans", y: .5, scale: 1.12 },
      { text: "YOUR NAME", color: "#183c30", font: "Georgia", y: .73, scale: .65 },
    ] },
    { id: "team", name: "Team spirit", description: "Your team and number", productColor: "#f4f1e9", lines: [
      { text: "YOUR TEAM", color: "#183c30", font: "PertySharpSans", y: .36, scale: 1 },
      { text: "01", color: "#fa3c00", font: "PertySharpSans", y: .66, scale: 1.8 },
    ] },
    { id: "business", name: "Business tee", description: "A simple branded shirt", productColor: "#f4f1e9", lines: [
      { text: "YOUR BRAND", color: "#183c30", font: "PertySharpSans", y: .4, scale: 1 },
      { text: "YOUR SLOGAN", color: "#fa3c00", font: "Arial", y: .64, scale: .58 },
    ] },
  ],
  hats: [
    { id: "team", name: "Team cap", description: "Wear your team name", productColor: "#e6d9b6", lines: [
      { text: "YOUR TEAM", color: "#183c30", font: "PertySharpSans", y: .48, scale: .72 },
    ] },
    { id: "initials", name: "Initials", description: "A classic monogram", productColor: "#e6d9b6", lines: [
      { text: "AB", color: "#183c30", font: "Georgia", y: .5, scale: 1.5 },
    ] },
    { id: "business", name: "Brand cap", description: "A clean logo alternative", productColor: "#e6d9b6", lines: [
      { text: "YOUR BRAND", color: "#183c30", font: "PertySharpSans", y: .5, scale: .65 },
    ] },
  ],
  pens: [
    { id: "business", name: "Business", description: "Your brand on a pen", productColor: "#f4f1e9", lines: [
      { text: "YOUR BRAND", color: "#183c30", font: "PertySharpSans", y: .5, scale: .6 },
    ] },
    { id: "event", name: "Event", description: "A keepsake for your event", productColor: "#f4f1e9", lines: [
      { text: "YOUR EVENT", color: "#fa3c00", font: "PertySharpSans", y: .5, scale: .6 },
    ] },
    { id: "thanks", name: "Thank you", description: "A short message", productColor: "#f4f1e9", lines: [
      { text: "THANK YOU", color: "#183c30", font: "Georgia", y: .5, scale: .6 },
    ] },
  ],
  lighters: [
    { id: "initials", name: "Initials", description: "A personal preview", productColor: "#f4f1e9", lines: [
      { text: "AB", color: "#183c30", font: "Georgia", y: .5, scale: 1.2 },
    ] },
    { id: "event", name: "Event", description: "Mark an occasion", productColor: "#f4f1e9", lines: [
      { text: "YOUR", color: "#183c30", font: "PertySharpSans", y: .38, scale: .65 },
      { text: "EVENT", color: "#fa3c00", font: "PertySharpSans", y: .62, scale: .65 },
    ] },
    { id: "brand", name: "Brand", description: "A simple brand preview", productColor: "#f4f1e9", lines: [
      { text: "YOUR", color: "#183c30", font: "PertySharpSans", y: .38, scale: .65 },
      { text: "BRAND", color: "#fa3c00", font: "PertySharpSans", y: .62, scale: .65 },
    ] },
  ],
};

export function templateLayers(template: StarterTemplate, area: PrintArea): TextLayer[] {
  const width = area.right - area.left;
  const height = area.bottom - area.top;
  return template.lines.map((line) => ({
    id: crypto.randomUUID(),
    kind: "text",
    text: line.text,
    color: line.color,
    font: line.font,
    x: (area.left + area.right) / 2,
    y: area.top + height * line.y,
    scale: Math.max(.4, Math.min(line.scale, width / (line.text.length * 23), height / (template.lines.length * 44))),
    rotation: 0,
    curve: line.curve,
  }));
}
