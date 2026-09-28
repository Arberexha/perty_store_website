import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { newDb } from "pg-mem";
import { registerAccount, verifyCredentials } from "./account";
import { loginSchema, registerSchema } from "./validation";

function testDatabase() {
  const db = newDb();
  const migration = readFileSync(path.join(process.cwd(), "db/migrations/001_identity.sql"), "utf8");
  db.public.none(migration);
  const { Pool } = db.adapters.createPg();
  return new Pool();
}

describe("customer accounts", () => {
  it("accepts a normalized email and a strong password", () => {
    const result = registerSchema.parse({ name: "  Alex  ", email: "  ALEX@EXAMPLE.COM  ", password: "long-secret-123" });
    expect(result.name).toBe("Alex");
    expect(result.email).toBe("alex@example.com");
    expect(registerSchema.safeParse({ name: "Alex", email: "alex@example.com", password: "short" }).success).toBe(false);
  });

  it("creates a usable account with a hashed password and enforces unique email", async () => {
    const pool = testDatabase();
    const input = registerSchema.parse({ name: "Alex", email: "Alex@example.com", password: "long-secret-123" });
    const id = await registerAccount(pool, input);
    const stored = await pool.query("SELECT password_hash, role FROM users WHERE id = $1", [id]);
    expect(stored.rows[0].password_hash).not.toBe(input.password);
    expect(stored.rows[0].role).toBe("customer");
    expect(await verifyCredentials(pool, input.email, input.password)).toBe(id);
    expect(await verifyCredentials(pool, input.email, "wrong-password")).toBeNull();
    expect(await verifyCredentials(pool, "missing@example.com", input.password)).toBeNull();
    await expect(registerAccount(pool, input)).rejects.toThrow();
    await pool.end();
  });

  it("normalizes login email", () => {
    expect(loginSchema.parse({ email: " ALEX@EXAMPLE.COM ", password: "x" }).email).toBe("alex@example.com");
  });
});
