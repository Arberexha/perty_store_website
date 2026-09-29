import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { hasValidOrigin } from "@/lib/auth/origin";
import { getPool } from "@/lib/db";
import { savedDesignSchema, validateSavedAssets } from "@/lib/saved-design";

const MAX_BYTES = 8_000_000;

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save your design." }, { status: 401 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return NextResponse.json({ error: "Design is too large to save." }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BYTES) return NextResponse.json({ error: "Design is too large to save." }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid design." }, { status: 400 }); }
  const parsed = savedDesignSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the design name and artwork, then try again." }, { status: 400 });
  const input = parsed.data;
  const preview = validateSavedAssets(input);
  if (!preview) return NextResponse.json({ error: "The design preview or artwork could not be saved." }, { status: 400 });
  const productResult = await getPool().query<{ id: string; name: string; slug: string }>("SELECT id,name,slug FROM products WHERE id=$1 AND status='published' AND design_template IS NOT NULL", [input.productId]);
  const product = productResult.rows[0];
  if (!product) return NextResponse.json({ error: "This product is no longer available." }, { status: 409 });
  if (input.id) {
    const result = await getPool().query("UPDATE saved_designs SET name=$3,design_data=$4,preview_png=$5,updated_at=now() WHERE id=$1 AND user_id=$2 AND product_id=$6 RETURNING id", [input.id, user.id, input.name, JSON.stringify(input.design), preview, input.productId]);
    if (!result.rowCount) return NextResponse.json({ error: "Saved design not found." }, { status: 404 });
    revalidatePath("/account");
    return NextResponse.json({ id: input.id });
  }
  const id = randomUUID();
  await getPool().query("INSERT INTO saved_designs (id,user_id,product_id,product_name,product_slug,name,design_data,preview_png) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [id, user.id, product.id, product.name, product.slug, input.name, JSON.stringify(input.design), preview]);
  revalidatePath("/account");
  return NextResponse.json({ id }, { status: 201 });
}
