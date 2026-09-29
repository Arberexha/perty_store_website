import { getPool } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return new Response(null, { status: 404 });
  const result = await getPool().query<{ preview_png: Buffer }>("SELECT preview_png FROM saved_designs WHERE share_token=$1", [token]);
  const preview = result.rows[0]?.preview_png;
  if (!preview) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(preview), { headers: { "Content-Type": "image/png", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
