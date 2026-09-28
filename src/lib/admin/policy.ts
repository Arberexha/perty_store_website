export function productOrderingError(input: {
  ageRestricted: boolean;
  categoryRestricted: boolean;
  status: string;
  hasPricedActiveVariant: boolean;
}): string | null {
  if (input.ageRestricted || input.categoryRestricted) return "18+ products cannot be ordered online";
  if (input.status !== "published") return "Publish the product before enabling ordering";
  if (!input.hasPricedActiveVariant) return "Add an active variant with an approved price before enabling ordering";
  return null;
}
