import { Pool } from "pg";

let pool;

export function setDbPool(customPool) {
  if (pool && typeof pool.end === "function" && pool !== customPool) {
    // Best-effort cleanup of previous pool
    pool.end().catch(() => {});
  }
  pool = customPool;
}

export function getDbPool() {
  if (pool) {
    return pool;
  }
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }
  pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  return pool;
}

export async function withTransaction(fn) {
  const activePool = getDbPool();
  const client = await activePool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw error;
  } finally {
    client.release();
  }
}
