import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { hasValidOrigin } from "@/lib/auth/origin";
import { decodeDesignImage, designRequestSchema } from "@/lib/design-request";
import { getPool } from "@/lib/db";

const MAX_BODY_BYTES = 8_000_000;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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
  if (input.layers.some((layer) => layer.kind === "image" && !decodeDesignImage(layer.src))) {
    return NextResponse.json({ error: "An uploaded image could not be saved. Please use a PNG, JPG, or WebP file under 1 MB." }, { status: 400 });
  }
  const preview = Buffer.from(input.previewPng.slice("data:image/png;base64,".length), "base64");
  if (preview.length < 100 || preview.length > 2_000_000 || !preview.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return NextResponse.json({ error: "The design preview could not be saved. Try downloading it first." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const id = randomUUID();
  await getPool().query(`INSERT INTO design_requests
    (id,user_id,product_type,customer_name,customer_email,customer_phone,quantity,notes,product_color,design_data,preview_png)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
    id, user?.id ?? null, input.product, input.customerName, input.customerEmail.toLowerCase(),
    input.customerPhone, input.quantity, input.notes, input.productColor,
    JSON.stringify({ layers: input.layers, personalizations: input.personalizations ?? [], previewSide: input.previewSide ?? "front", previewHeight: input.previewHeight ?? 420, productColors: input.productColors ?? [input.productColor] }), preview,
  ]);
  revalidatePath("/admin/design-requests");
  return NextResponse.json({ id }, { status: 201 });
}
