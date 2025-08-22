import { timingSafeEqual } from 'crypto';

export function requireAuth(req, res, next) {
  const token = process.env.ANALYTICS_AUTH_TOKEN;
  if (!token) {
    return res
      .status(401)
      .json({ error: 'Analytics auth token not configured' });
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const receivedToken = match[1].trim();
  const expectedBuffer = Buffer.from(token);
  const receivedBuffer = Buffer.from(receivedToken);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
