export function requireAuth(req, res, next) {
  const token = process.env.ANALYTICS_AUTH_TOKEN;
  const authHeader = req.headers.authorization;
  if (token && authHeader !== `Bearer ${token}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
