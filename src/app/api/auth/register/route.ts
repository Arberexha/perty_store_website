import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { registerAccount } from "@/lib/auth/account";
import { hasValidOrigin } from "@/lib/auth/origin";
import { createSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/auth/validation";

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your name, email, and password" }, { status: 400 });

  let userId: string;
  try {
    userId = await registerAccount(getPool(), parsed.data);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw error;
  }
  await createSession(userId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
