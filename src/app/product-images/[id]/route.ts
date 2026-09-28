import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPool().query<{ mockup_image: Buffer | null; mockup_mime: string | null; status: string }>(
    "SELECT mockup_image,mockup_mime,status FROM products WHERE id=$1",
    [id],
  );
  const product = result.rows[0];
  if (!product?.mockup_image || !product.mockup_mime) return new Response(null, { status: 404 });
  if (product.status !== "published" && (await getCurrentUser())?.role !== "admin") return new Response(null, { status: 404 });
  return new Response(new Uint8Array(product.mockup_image), {
    headers: { "Content-Type": product.mockup_mime, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
