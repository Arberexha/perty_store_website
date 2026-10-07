import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const { id, itemId } = await params;
  const result = await getPool().query<{ preview_png: Buffer }>(
    "SELECT i.preview_png FROM order_items i JOIN orders o ON o.id=i.order_id WHERE o.id=$1 AND i.id=$2 AND o.user_id=$3",
    [id, itemId, user.id],
  );
  const preview = result.rows[0]?.preview_png;
  if (!preview) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(preview), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
