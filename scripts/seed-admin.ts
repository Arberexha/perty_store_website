import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { Pool } from "pg";
import { registerSchema } from "../src/lib/auth/validation";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const parsed = registerSchema.safeParse({
    name: "Shop owner",
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
  if (!parsed.success) throw new Error("Set a valid ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters)");

  const pool = new Pool({ connectionString });
  try {
    const passwordHash = await hash(parsed.data.password, 12);
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [randomUUID(), parsed.data.email, passwordHash, parsed.data.name],
    );
    if (result.rowCount) {
      console.log("Admin account created");
    } else {
      const existing = await pool.query<{ role: string }>("SELECT role FROM users WHERE email = $1", [parsed.data.email]);
      if (existing.rows[0]?.role !== "admin") throw new Error("ADMIN_EMAIL belongs to a customer account; choose a different address");
      console.log("Admin account already exists; password was left unchanged");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
