import { randomUUID } from "crypto";
import { getDbPool, withTransaction } from "./db.js";

function normalizeUpdatedAt(value) {
  return new Date(value).toISOString();
}

export async function findSchedulerState(userId, facilityId) {
  const pool = getDbPool();
  const result = await pool.query(
    `SELECT id, version, state_json, updated_at
     FROM scheduler_states
     WHERE user_id = $1 AND facility_id = $2`,
    [userId, facilityId],
  );
  if (result.rowCount === 0) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row.id,
    version: row.version,
    state: row.state_json,
    updatedAt: normalizeUpdatedAt(row.updated_at),
  };
}

export async function upsertSchedulerState(userId, facilityId, expectedVersion, state) {
  const timestamp = new Date().toISOString();
  const normalizedState = { ...state, updatedAt: timestamp };

  return withTransaction(async (client) => {
    const existing = await client.query(
      `SELECT id, version, updated_at
       FROM scheduler_states
       WHERE user_id = $1 AND facility_id = $2
       FOR UPDATE`,
      [userId, facilityId],
    );

    if (existing.rowCount === 0) {
      const id = randomUUID();
      try {
        const inserted = await client.query(
          `INSERT INTO scheduler_states (id, user_id, facility_id, version, state_json, updated_at)
           VALUES ($1, $2, $3, 1, $4, $5)
           RETURNING version, updated_at`,
          [id, userId, facilityId, normalizedState, timestamp],
        );
        const row = inserted.rows[0];
        return {
          status: "created",
          version: row.version,
          updatedAt: normalizeUpdatedAt(row.updated_at ?? timestamp),
          state: normalizedState,
        };
      } catch (error) {
        if (error?.code === "23505") {
          const latest = await client.query(
            `SELECT version, updated_at
             FROM scheduler_states
             WHERE user_id = $1 AND facility_id = $2`,
            [userId, facilityId],
          );
          if (latest.rowCount > 0) {
            const latestRow = latest.rows[0];
            return {
              status: "conflict",
              version: latestRow.version,
              updatedAt: normalizeUpdatedAt(latestRow.updated_at),
            };
          }
        }
        throw error;
      }
    }

    const row = existing.rows[0];
    if (row.version !== expectedVersion) {
      return {
        status: "conflict",
        version: row.version,
        updatedAt: normalizeUpdatedAt(row.updated_at),
      };
    }

    const nextVersion = row.version + 1;
    const updated = await client.query(
      `UPDATE scheduler_states
       SET state_json = $1, version = $2, updated_at = $3
       WHERE id = $4 AND version = $5
       RETURNING version, updated_at`,
      [normalizedState, nextVersion, timestamp, row.id, row.version],
    );
    if (updated.rowCount === 0) {
      const latest = await client.query(
        `SELECT version, updated_at FROM scheduler_states WHERE id = $1`,
        [row.id],
      );
      const latestRow = latest.rows[0];
      return {
        status: "conflict",
        version: latestRow.version,
        updatedAt: normalizeUpdatedAt(latestRow.updated_at),
      };
    }
    const updatedRow = updated.rows[0];
    return {
      status: "updated",
      version: updatedRow.version,
      updatedAt: normalizeUpdatedAt(updatedRow.updated_at ?? timestamp),
      state: normalizedState,
    };
  });
}
