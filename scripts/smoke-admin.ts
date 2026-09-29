import "dotenv/config";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Pool } from "pg";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const userId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await pool.query("INSERT INTO users (id,email,password_hash,name,role) VALUES ($1,$2,$3,$4,'admin')", [userId, `smoke-${userId}@example.invalid`, "temporary-test-account", "Smoke test"]);
    await pool.query("INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,now() + interval '10 minutes')", [tokenHash, userId]);
    for (const path of ["/admin", "/admin/products", "/admin/products/new", "/admin/categories", "/admin/categories/new", "/admin/orders", "/admin/quotes", "/admin/quotes/new", "/admin/design-requests", "/admin/files", "/admin/customers", "/admin/settings", "/admin/products/product-tshirt"]) {
      const response = await fetch(new URL(path, baseUrl), { headers: { Cookie: `perty_session=${token}` }, redirect: "manual" });
      if (response.status !== 200) throw new Error(`${path} returned HTTP ${response.status}`);
      const html = await response.text();
      if (!html.includes("admin-shell")) throw new Error(`${path} did not render the admin layout`);
      console.log(`OK ${path}`);
    }
  } finally {
    await pool.query("DELETE FROM users WHERE id=$1", [userId]);
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
