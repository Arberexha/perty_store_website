import { describe, expect, it } from "vitest";
import { mockupMime } from "./product-mockup";

describe("product mockups", () => {
  it("recognizes image signatures rather than trusting file names", () => {
    expect(mockupMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe("image/png");
    expect(mockupMime(Buffer.from("<script>alert(1)</script>"))).toBeNull();
  });
});
