import { describe, expect, it } from "vitest";
import { DEFAULT_PRINT_AREA, mockupMime, validPrintArea } from "./product-mockup";

describe("product mockups", () => {
  it("keeps the print area inside the preview", () => {
    expect(validPrintArea(DEFAULT_PRINT_AREA)).toBe(true);
    expect(validPrintArea({ left: 900, top: 200, right: 1100, bottom: 300 })).toBe(false);
    expect(validPrintArea({ left: 500, top: 200, right: 500, bottom: 300 })).toBe(false);
  });

  it("recognizes image signatures rather than trusting file names", () => {
    expect(mockupMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("image/png");
    expect(mockupMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
});
