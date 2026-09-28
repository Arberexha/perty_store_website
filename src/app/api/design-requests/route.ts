import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { hasValidOrigin } from "@/lib/auth/origin";
import { designRequestSchema, validatedDesignAssets } from "@/lib/design-request";
import { getPool } from "@/lib/db";

const MAX_BODY_BYTES = 8_000_000;

export async function POST(request: NextRequest) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return NextResponse.json({ error: "Design is too large to submit" }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > MAX_BODY_BYTES) return NextResponse.json({ error: "Design is too large to submit" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "Invalid design request" }, { status: 400 }); }
  const parsed = designRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check your contact details and design, then try again" }, { status: 400 });
  const input = parsed.data;
  const catalog = await getPool().query<{ name: string; design_template: string; age_restricted: boolean; has_mockup: boolean }>(
    "SELECT name,design_template,age_restricted,(mockup_image IS NOT NULL) AS has_mockup FROM products WHERE id=$1 AND status='published'",
    [input.catalogProductId],
  );
  const selectedProduct = catalog.rows[0];
  if (!selectedProduct || selectedProduct.design_template !== input.product || selectedProduct.age_restricted) {
    return NextResponse.json({ error: "This product is no longer available for design requests" }, { status: 400 });
  }
  const assets = validatedDesignAssets(input);
  if (assets.error) return NextResponse.json({ error: assets.error }, { status: 400 });

  const user = await getCurrentUser();
  const id = randomUUID();
  await getPool().query(`INSERT INTO design_requests
    (id,user_id,product_type,product_id,product_name,customer_name,customer_email,customer_phone,quantity,notes,product_color,design_data,preview_png)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [
    id, user?.id ?? null, input.product, input.catalogProductId, selectedProduct.name, input.customerName, input.customerEmail.toLowerCase(),
    input.customerPhone, input.quantity, input.notes, input.productColor,
    JSON.stringify({ layers: input.layers, personalizations: input.personalizations ?? [], previewSide: input.previewSide ?? "front", previewHeight: input.previewHeight ?? 420, productColors: input.productColors ?? [input.productColor], photoMockup: selectedProduct.has_mockup }), assets.preview,
  ]);
  revalidatePath("/admin/design-requests");
  return NextResponse.json({ id }, { status: 201 });
}
