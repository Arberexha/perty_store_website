import { describe, expect, it } from "vitest";
import { removePlainBackground } from "./remove-plain-background";

function image(width: number, height: number, color: [number, number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set(color, i);
  return pixels;
}

describe("plain background removal", () => {
  it("removes a white border while retaining colored artwork and an enclosed light area", () => {
    const pixels = image(5, 5, [255, 255, 255, 255]);
    for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) pixels.set([220, 0, 30, 255], (y * 5 + x) * 4);
    pixels.set([255, 255, 255, 255], (2 * 5 + 2) * 4);
    expect(removePlainBackground(pixels, 5, 5)).toBe(true);
    expect(pixels[3]).toBe(0);
    expect(pixels[(2 * 5 + 1) * 4 + 3]).toBe(255);
    expect(pixels[(2 * 5 + 2) * 4 + 3]).toBe(255);
  });

  it("keeps a transparent image and a dark image unchanged", () => {
    const transparent = image(4, 4, [255, 255, 255, 0]);
    const dark = image(4, 4, [30, 40, 50, 255]);
    expect(removePlainBackground(transparent, 4, 4)).toBe(false);
    expect(removePlainBackground(dark, 4, 4)).toBe(false);
  });
});
