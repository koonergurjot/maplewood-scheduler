# Configuration

Maplewood Scheduler uses environment variables for runtime settings.

| Variable | Required | Description |
|---------|----------|-------------|
| `ANALYTICS_AUTH_TOKEN` | ✅ | Bearer token protecting analytics endpoints |
| `PORT` | ❌ (`3000`) | Port the server listens on |

## Example `.env.local`

```bash
ANALYTICS_AUTH_TOKEN=mys3cret
PORT=3000
```

Store secrets outside of version control. Use `.env.local` for development
and provider-specific secret managers in production.
