import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from '../server/auth.js';

describe('requireAuth', () => {
  beforeEach(() => {
    delete process.env.ANALYTICS_AUTH_TOKEN;
  });

  it('allows requests when no token is configured', () => {
    const req: any = { headers: {} };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects requests with invalid token', () => {
    process.env.ANALYTICS_AUTH_TOKEN = 'secret';
    const req: any = { headers: { authorization: 'Bearer wrong' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests with valid token', () => {
    process.env.ANALYTICS_AUTH_TOKEN = 'secret';
    const req: any = { headers: { authorization: 'Bearer secret' } };
    const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
