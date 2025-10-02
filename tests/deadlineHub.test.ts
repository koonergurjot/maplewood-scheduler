import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app, deadlineHub } from "../server/index.js";

describe("POST /api/deadlines", () => {
  const token = "test-token";

  beforeEach(() => {
    process.env.ANALYTICS_AUTH_TOKEN = token;
  });

  afterEach(() => {
    delete process.env.ANALYTICS_AUTH_TOKEN;
    vi.restoreAllMocks();
  });

  it("coerces invalid deadline values and still accepts the batch", async () => {
    const broadcastSpy = vi
      .spyOn(deadlineHub, "broadcast")
      .mockImplementation(async (event) => event);

    const res = await request(app)
      .post("/api/deadlines")
      .set("Authorization", `Bearer ${token}`)
      .send({
        events: [
          {
            id: "evt-1",
            vacancyId: "vac-123",
            message: "Hello",
            deadlineAt: "not-a-date",
            channels: ["email"],
          },
        ],
      });

    expect(res.status).toBe(202);
    expect(res.body).toEqual({ accepted: 1 });
    expect(broadcastSpy).toHaveBeenCalledTimes(1);

    const [eventArg] = broadcastSpy.mock.calls[0];
    const parsedDeadline = new Date(eventArg.deadlineAt);
    const parsedTriggered = new Date(eventArg.triggeredAt);

    expect(Number.isNaN(parsedDeadline.getTime())).toBe(false);
    expect(eventArg.deadlineAt).toBe(parsedDeadline.toISOString());
    expect(Number.isNaN(parsedTriggered.getTime())).toBe(false);
    expect(eventArg.triggeredAt).toBe(parsedTriggered.toISOString());
  });
});
