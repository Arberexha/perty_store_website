import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new NextResponse(null, { status: 403 });
  const { id, itemId } = await params;
  const result = await getPool().query<{ preview_png: Buffer }>("SELECT preview_png FROM order_items WHERE id=$1 AND order_id=$2", [itemId, id]);
  if (!result.rows[0]?.preview_png) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(result.rows[0].preview_png), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
