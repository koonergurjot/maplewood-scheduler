import jwt from "jsonwebtoken";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function requireSchedulerAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!isNonEmptyString(secret)) {
    return res.status(500).json({ error: "Scheduler auth secret not configured" });
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(match[1], secret);
    if (!payload || typeof payload !== "object") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { userId, facilityId } = payload;
    if (!isNonEmptyString(userId) || !isNonEmptyString(facilityId)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.schedulerIdentity = {
      userId: String(userId),
      facilityId: String(facilityId),
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
