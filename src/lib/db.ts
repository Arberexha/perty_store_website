import "server-only";
import { Pool } from "pg";

declare global {
  // Reuse the pool during local hot reloads.
  var pertyPool: Pool | undefined;
}

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  if (!global.pertyPool) {
    global.pertyPool = new Pool({ connectionString, max: 10 });
  }
  return global.pertyPool;
}
