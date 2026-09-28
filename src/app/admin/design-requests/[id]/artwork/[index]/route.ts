import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { decodeDesignImage } from "@/lib/design-request";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new NextResponse(null, { status: 403 });
  const { id, index } = await params;
  const layerIndex = Number(index);
  if (!Number.isSafeInteger(layerIndex) || layerIndex < 0 || layerIndex > 19) return new NextResponse(null, { status: 404 });
  const result = await getPool().query<{ design_data: { layers?: Array<{ kind: string; src?: string }> } }>("SELECT design_data FROM design_requests WHERE id=$1", [id]);
  const layer = result.rows[0]?.design_data?.layers?.[layerIndex];
  if (layer?.kind !== "image" || !layer.src) return new NextResponse(null, { status: 404 });
  const image = decodeDesignImage(layer.src);
  if (!image) return new NextResponse(null, { status: 404 });
  const extension = image.mimeType === "image/jpeg" ? "jpg" : image.mimeType === "image/webp" ? "webp" : "png";
  const safeId = id.slice(0, 8).replaceAll(/[^a-zA-Z0-9]/g, "");
  return new NextResponse(new Uint8Array(image.bytes), { headers: { "Content-Type": image.mimeType, "Content-Disposition": `attachment; filename="perty-artwork-${safeId}-${layerIndex}.${extension}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
