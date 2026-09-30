import { describe, expect, it } from "vitest";
import { decodeDesignImage, designRequestSchema } from "./design-request";

const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=";
const request = {
  product: "shirts", catalogProductId: "product-tshirt", customerName: "Sample Customer", customerEmail: "sample@example.com", customerPhone: "", quantity: 3,
  notes: "Please contact me", productColor: "#f4f1e9", previewPng: png,
  layers: [{ id: "text-1", kind: "text", text: "Hello", color: "#183c30", font: "Arial", x: 500, y: 210, scale: 1, rotation: 0 }],
};

describe("design request validation", () => {
  it("accepts a complete request and rejects age-restricted products", () => {
    expect(designRequestSchema.safeParse(request).success).toBe(true);
    expect(designRequestSchema.safeParse({ ...request, product: "lighters" }).success).toBe(false);
  });

  it("rejects empty designs and invalid uploaded image data", () => {
    expect(designRequestSchema.safeParse({ ...request, layers: [] }).success).toBe(false);
    expect(decodeDesignImage(png)?.mimeType).toBe("image/png");
    expect(decodeDesignImage("data:image/png;base64,AAAA")).toBeNull();
  });

  it("accepts multi-area shirt artwork and a names-and-numbers list", () => {
    const shirtRequest = { ...request, previewSide: "overview", previewHeight: 420, productColors: ["#f4f1e9", "#292b29"], personalizations: [{ name: "Avery", number: "12", size: "M" }], layers: [{ ...request.layers[0], side: "back", font: "PertySharpSans", outlineColor: "#ffffff", outlineWidth: 2, curve: 30 }] };
    expect(designRequestSchema.safeParse(shirtRequest).success).toBe(true);
    expect(designRequestSchema.safeParse({ ...shirtRequest, previewSide: "collar" }).success).toBe(false);
    expect(designRequestSchema.safeParse({ ...shirtRequest, previewSide: "left-chest" }).success).toBe(false);
    expect(designRequestSchema.safeParse({ ...shirtRequest, layers: [{ ...shirtRequest.layers[0], side: "left-sleeve" }] }).success).toBe(false);
    expect(designRequestSchema.safeParse({ ...shirtRequest, layers: [{ ...shirtRequest.layers[0], side: "right-sleeve" }] }).success).toBe(false);
  });
});
