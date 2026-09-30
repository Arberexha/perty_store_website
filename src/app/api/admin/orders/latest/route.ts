import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new NextResponse(null, { status: 403 });

  const result = await getPool().query<{ id: string }>("SELECT id FROM orders ORDER BY created_at DESC, id DESC LIMIT 1");
  return NextResponse.json(
    { latestOrderId: result.rows[0]?.id ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
