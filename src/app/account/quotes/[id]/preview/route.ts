import { getCurrentUser } from "@/lib/auth/session";
import { getPool } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { id } = await context.params;
  const result = await getPool().query<{ preview_png: Buffer }>(`SELECT coalesce(q.proof_png,r.preview_png) AS preview_png FROM quotes q JOIN design_requests r ON r.id=q.design_request_id
    WHERE q.id=$1 AND q.user_id=$2 AND r.user_id=$2`, [id, user.id]);
  const preview = result.rows[0]?.preview_png;
  if (!preview) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(preview), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
