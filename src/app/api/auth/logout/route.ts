import { NextRequest, NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/auth/origin";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  await destroySession();
  return NextResponse.json({ ok: true });
}
