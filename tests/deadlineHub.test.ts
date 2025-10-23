import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import type { ServerResponse } from "http";
import { DeadlineHub } from "../server/deadlineHub.js";
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

describe("DeadlineHub", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("removes clients whose streams fail during broadcast", async () => {
    const dispatcher = { dispatch: vi.fn().mockResolvedValue(undefined) };
    const hub = new DeadlineHub({ dispatcher });
    const writeMock = vi.fn();
    const endMock = vi.fn();
    const res = { write: writeMock, end: endMock } as unknown as ServerResponse;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    hub.addClient(res);
    expect(hub.clients.size).toBe(1);

    writeMock.mockImplementationOnce(() => {
      throw new Error("stream closed");
    });

    await hub.broadcast({
      vacancyId: "vac-123",
      leadTimeId: "custom",
      message: "Test event",
      deadlineAt: "2024-01-01T00:00:00.000Z",
      triggeredAt: "2024-01-01T00:00:00.000Z",
      channels: ["email"],
    });

    expect(hub.clients.size).toBe(0);
    expect(endMock).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      "Failed to push deadline event to client",
      expect.any(Error),
    );
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);

  });
});
