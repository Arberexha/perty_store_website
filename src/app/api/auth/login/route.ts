import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { verifyCredentials } from "@/lib/auth/account";
import { hasValidOrigin } from "@/lib/auth/origin";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });

  const userId = await verifyCredentials(getPool(), parsed.data.email, parsed.data.password);
  if (!userId) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }
  await createSession(userId);
  return NextResponse.json({ ok: true });
}
