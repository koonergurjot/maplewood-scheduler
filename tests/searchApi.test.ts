import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server/index.js";
import { sampleVacancies } from "../server/metrics.js";

describe("GET /api/search", () => {
  it("filters by q parameter", async () => {
    const res = await request(app).get("/api/search").query({ q: "2024-03-03" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      sampleVacancies.find((v) => v.date === "2024-03-03"),
    ]);
  });

  it("filters by category parameter", async () => {
    const res = await request(app).get("/api/search").query({ category: "awarded" });
    expect(res.status).toBe(200);
    expect(res.body.every((v: any) => v.status === "awarded")).toBe(true);
  });

  it("respects start and end parameters", async () => {
    const res = await request(app).get("/api/search").query({ start: 2, end: 4 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleVacancies.slice(2, 4));
  });
});

