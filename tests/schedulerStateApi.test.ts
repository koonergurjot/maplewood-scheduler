import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { newDb } from "pg-mem";
import { app } from "../server/index.js";
import { setDbPool } from "../server/db.js";
import { resetSchedulerRateLimiter } from "../server/schedulerRateLimiter.js";

const JWT_SECRET = "test-secret";
process.env.JWT_SECRET = JWT_SECRET;

function createToken(userId = "user-1", facilityId = "facility-1") {
  return jwt.sign({ userId, facilityId }, JWT_SECRET);
}

const baseState = {
  employees: [],
  vacations: [],
  vacancies: [],
  bids: [],
  archivedBids: {},
  settings: {
    responseWindows: { lt2h: 1, h2to4: 2, h4to24: 3, h24to72: 4, gt72: 5 },
  },
  vacancyRanges: [],
  updatedAt: new Date(0).toISOString(),
};

let pool;

beforeAll(async () => {
  const db = newDb();
  const adapter = db.adapters.createPg();
  const { Pool } = adapter;
  pool = new Pool();
  setDbPool(pool);

  const migrationPath = join(
    process.cwd(),
    "migrations",
    "2025-02-15-scheduler-states.sql",
  );
  const migrationSql = readFileSync(migrationPath, "utf8");
  await pool.query(migrationSql);
});

beforeEach(async () => {
  resetSchedulerRateLimiter();
  await pool.query("TRUNCATE scheduler_states");
});

afterAll(async () => {
  await pool?.end();
});

describe("Scheduler state auth", () => {
  it("rejects missing token", async () => {
    const res = await request(app).get("/api/scheduler-state");
    expect(res.status).toBe(401);
  });

  it("rejects token without required claims", async () => {
    const token = jwt.sign({ foo: "bar" }, JWT_SECRET);
    const res = await request(app)
      .get("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe("Scheduler state API", () => {
  it("returns 204 when no state exists", async () => {
    const token = createToken();
    const res = await request(app)
      .get("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it("creates state on first write", async () => {
    const token = createToken();
    const res = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 0 });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ version: 1 });
  });

  it("returns stored state on GET", async () => {
    const token = createToken();
    await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 0 });

    const res = await request(app)
      .get("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
    expect(res.body.state.updatedAt).toBe(res.body.updatedAt);
    expect(res.body.state.settings.responseWindows.lt2h).toBe(1);
  });

  it("updates when version matches", async () => {
    const token = createToken();
    await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 0 });

    const res = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({
        state: {
          ...baseState,
          settings: {
            responseWindows: {
              lt2h: 10,
              h2to4: 20,
              h4to24: 30,
              h24to72: 40,
              gt72: 50,
            },
          },
        },
        version: 1,
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ version: 2 });
  });

  it("returns 409 when version mismatches", async () => {
    const token = createToken();
    await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 0 });

    const res = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 99 });
    expect(res.status).toBe(409);
    expect(res.body.serverVersion).toBe(1);
    expect(typeof res.body.updatedAt).toBe("string");
  });

  it("rejects invalid schema", async () => {
    const token = createToken();
    const res = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: { ...baseState, updatedAt: 123 }, version: 0 });
    expect(res.status).toBe(422);
  });

  it("rejects large payloads", async () => {
    const token = createToken();
    const hugeNote = "x".repeat(2 * 1024 * 1024 + 1);
    const res = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({
        state: {
          ...baseState,
          vacations: [
            {
              id: "vac1",
              employeeId: "emp1",
              employeeName: "Name",
              classification: "Registered Nurse",
              wing: "Wing",
              startDate: "2024-01-01",
              endDate: "2024-01-02",
              notes: hugeNote,
              archived: false,
            },
          ],
        },
        version: 0,
      });
    expect(res.status).toBe(413);
  });

  it("rejects incorrect content type", async () => {
    const token = createToken();
    const res = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .set("Content-Type", "text/plain")
      .send("not-json");
    expect(res.status).toBe(415);
  });

  it("enforces optimistic concurrency", async () => {
    const token = createToken();
    await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 0 });

    const payload = { state: baseState, version: 1 };
    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/scheduler-state")
        .set("Authorization", `Bearer ${token}`)
        .send(payload),
      request(app)
        .post("/api/scheduler-state")
        .set("Authorization", `Bearer ${token}`)
        .send(payload),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);
  });

  it("allows retry after conflict", async () => {
    const token = createToken();
    await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 0 });

    const conflict = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: 99 });
    expect(conflict.status).toBe(409);

    const retry = await request(app)
      .post("/api/scheduler-state")
      .set("Authorization", `Bearer ${token}`)
      .send({ state: baseState, version: conflict.body.serverVersion });
    expect(retry.status).toBe(200);
  });
});
