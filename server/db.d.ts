import type { Pool, PoolClient } from "pg";

export declare function setDbPool(pool: Pool): void;
export declare function getDbPool(): Pool;
export declare function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T>;
