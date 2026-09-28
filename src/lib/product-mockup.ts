export type PrintArea = { left: number; top: number; right: number; bottom: number };

export const DEFAULT_PRINT_AREA: PrintArea = { left: 420, top: 120, right: 580, bottom: 300 };
export const MAX_MOCKUP_BYTES = 5_000_000;

export function validPrintArea(area: PrintArea): boolean {
  return Number.isInteger(area.left) && Number.isInteger(area.top) && Number.isInteger(area.right) && Number.isInteger(area.bottom)
    && area.left >= 0 && area.right <= 1000 && area.right - area.left >= 20
    && area.top >= 0 && area.bottom <= 420 && area.bottom - area.top >= 20;
}

export function mockupMime(bytes: Buffer): "image/png" | "image/jpeg" | "image/webp" | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return "image/jpeg";
  if (bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

export function productImageUrl(id: string, updatedAt: Date | string): string {
  return `/product-images/${encodeURIComponent(id)}?v=${new Date(updatedAt).getTime()}`;
}
