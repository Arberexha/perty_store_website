import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new NextResponse(null, { status: 403 });
  const { id } = await params;
  const result = await getPool().query<{ preview_png: Buffer }>("SELECT preview_png FROM design_requests WHERE id=$1", [id]);
  if (!result.rows[0]) return new NextResponse(null, { status: 404 });
  const bytes = new Uint8Array(result.rows[0].preview_png);
  return new NextResponse(bytes, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
