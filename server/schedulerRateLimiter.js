const WINDOW_MS = 60_000;
const LIMIT = 60;

const buckets = new Map();

function cleanup(now) {
  for (const [key, entries] of buckets.entries()) {
    const filtered = entries.filter((timestamp) => now - timestamp < WINDOW_MS);
    if (filtered.length > 0) {
      buckets.set(key, filtered);
    } else {
      buckets.delete(key);
    }
  }
}

export function resetSchedulerRateLimiter() {
  buckets.clear();
}

export function schedulerRateLimit(req, res, next) {
  const identity = req.schedulerIdentity;
  if (!identity) {
    return res.status(500).json({ error: "Identity not set for rate limiter" });
  }
  const key = `${identity.facilityId}:${identity.userId}`;
  const now = Date.now();
  const existing = buckets.get(key) ?? [];
  const recent = existing.filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recent.length >= LIMIT) {
    cleanup(now);
    return res
      .status(429)
      .json({ error: "Too many requests. Please try again shortly." });
  }
  recent.push(now);
  buckets.set(key, recent);
  cleanup(now);
  next();
}
