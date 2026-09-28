import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { hasValidOrigin } from "./origin";

describe("hasValidOrigin", () => {
  it("accepts the requested host and rejects another origin", () => {
    const request = (origin: string) => new NextRequest("http://localhost:3000/api/design-requests", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin },
    });
    expect(hasValidOrigin(request("http://127.0.0.1:3000"))).toBe(true);
    expect(hasValidOrigin(request("http://other.example:3000"))).toBe(false);
    expect(hasValidOrigin(request("https://127.0.0.1:3000"))).toBe(false);
  });
});
