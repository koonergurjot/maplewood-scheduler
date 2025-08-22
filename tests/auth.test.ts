import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireAuth } from "../server/auth.js";

describe("requireAuth", () => {
  beforeEach(() => {
    delete process.env.ANALYTICS_AUTH_TOKEN;
  });

  it("rejects requests when no token is configured", () => {
    const req: any = { headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "Analytics auth token not configured",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects requests with invalid token", () => {
    process.env.ANALYTICS_AUTH_TOKEN = "secret";
    const req: any = { headers: { authorization: "Bearer wrong" } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows requests with valid token", () => {
    process.env.ANALYTICS_AUTH_TOKEN = "secret";
    const req: any = { headers: { authorization: "Bearer secret" } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows requests with varied bearer casing", () => {
    process.env.ANALYTICS_AUTH_TOKEN = "secret";
    const variants = ["bearer secret", "BEARER secret", "BeArEr secret"];
    for (const authorization of variants) {
      const req: any = { headers: { authorization } };
      const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next = vi.fn();
      requireAuth(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it("allows requests with trailing spaces after token", () => {
    process.env.ANALYTICS_AUTH_TOKEN = "secret";
    const req: any = { headers: { authorization: "Bearer secret   " } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
