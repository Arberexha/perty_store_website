import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import type { Pool } from "pg";

export async function registerAccount(
  db: Pick<Pool, "query">,
  input: { name: string; email: string; password: string },
): Promise<string> {
  const id = randomUUID();
  await db.query(
    "INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)",
    [id, input.email, await hash(input.password, 12), input.name],
  );
  return id;
}

export async function verifyCredentials(
  db: Pick<Pool, "query">,
  email: string,
  password: string,
): Promise<string | null> {
  const result = await db.query<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = result.rows[0];
  if (!user || !(await compare(password, user.password_hash))) return null;
  return user.id;
}
