// Removes a light, nearly uniform background connected to an image's edges.
// Artwork enclosed by a colored outline remains opaque.
export function removePlainBackground(pixels: Uint8ClampedArray, width: number, height: number): boolean {
  const count = width * height;
  if (!count || pixels.length !== count * 4) return false;
  let lightBorder = 0;
  let sampledBorder = 0;
  const isWhite = (index: number) => {
    const offset = index * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    return pixels[offset + 3] > 245 && Math.min(r, g, b) > 235 && Math.max(r, g, b) - Math.min(r, g, b) < 22;
  };
  const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 64));
  for (let x = 0; x < width; x += sampleStep) {
    lightBorder += Number(isWhite(x)) + Number(isWhite((height - 1) * width + x));
    sampledBorder += 2;
  }
  for (let y = 0; y < height; y += sampleStep) {
    lightBorder += Number(isWhite(y * width)) + Number(isWhite(y * width + width - 1));
    sampledBorder += 2;
  }
  if (lightBorder / sampledBorder < 0.85) return false;

  const seen = new Uint8Array(count);
  const queue = new Uint32Array(count);
  let head = 0;
  let tail = 0;
  const add = (index: number) => {
    if (seen[index]) return;
    seen[index] = 1;
    const offset = index * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    if (pixels[offset + 3] < 245 || Math.min(r, g, b) < 160 || Math.max(r, g, b) - Math.min(r, g, b) > 95) return;
    queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  if (!tail) return false;

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    if (x > 0) add(index - 1);
    if (x + 1 < width) add(index + 1);
    if (index >= width) add(index - width);
    if (index + width < count) add(index + width);
  }
  for (let i = 0; i < tail; i++) {
    const offset = queue[i] * 4;
    const r = pixels[offset];
    const g = pixels[offset + 1];
    const b = pixels[offset + 2];
    const alpha = Math.max(0, Math.min(1, (255 - Math.min(r, g, b)) / 255));
    if (alpha < 0.01) {
      pixels[offset + 3] = 0;
    } else {
      pixels[offset] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - alpha)) / alpha)));
      pixels[offset + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - alpha)) / alpha)));
      pixels[offset + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - alpha)) / alpha)));
      pixels[offset + 3] = Math.round(pixels[offset + 3] * alpha);
    }
  }
  return true;
}
