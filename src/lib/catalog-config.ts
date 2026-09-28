export const designTemplates = ["pens", "shirts", "hats", "lighters"] as const;
export type DesignTemplate = (typeof designTemplates)[number];

export function isDesignTemplate(value: string): value is DesignTemplate {
  return designTemplates.some((template) => template === value);
}

export const templateVisuals: Record<DesignTemplate, { image: string; alt: string; className: string }> = {
  pens: { image: "/images/colorful-pens.png", alt: "Custom printed pens", className: "pens" },
  shirts: { image: "/images/printed-tee-lifestyle.png", alt: "Custom printed T-shirt", className: "shirts" },
  hats: { image: "/images/printed-cap.png", alt: "Custom printed hat", className: "hats" },
  lighters: { image: "/images/printed-lighter.png", alt: "Custom printed lighter", className: "more" },
};
