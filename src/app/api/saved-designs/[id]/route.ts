import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to open your design." }, { status: 401 });
  const { id } = await context.params;
  const result = await getPool().query<{ id: string; name: string; product_id: string | null; design_data: unknown }>("SELECT id,name,product_id,design_data FROM saved_designs WHERE id=$1 AND user_id=$2", [id, user.id]);
  const design = result.rows[0];
  if (!design) return NextResponse.json({ error: "Saved design not found." }, { status: 404 });
  return NextResponse.json({ id: design.id, name: design.name, productId: design.product_id, design: design.design_data }, { headers: { "Cache-Control": "private, no-store" } });
}
