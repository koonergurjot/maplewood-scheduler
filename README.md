# Maplewood Scheduler (Vite + React + TS)

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Analytics API authentication

The analytics endpoints require a bearer token for access.

1. Set a secret token in the `ANALYTICS_AUTH_TOKEN` environment variable.
2. Include an `Authorization: Bearer <token>` header on requests to `/api/analytics` and `/api/analytics/export`.
3. Requests missing or providing an invalid token will receive `401 Unauthorized`.

Example:

```bash
export ANALYTICS_AUTH_TOKEN=mys3cret
npm run server
```

## Analytics API options

Analytics endpoints accept an optional `overtimeThreshold` query parameter to
control how overtime hours are calculated. The default threshold is **8** hours.

Example:

```bash
curl -H "Authorization: Bearer $ANALYTICS_AUTH_TOKEN" \
  "http://localhost:3000/api/analytics?overtimeThreshold=10"
```

## Responsive design
- Mobile breakpoint at **600px** is defined in `src/styles/responsive.css`.
- Use the `responsive-table` class on tables and `form-row` for grouped form inputs to stack vertically on narrow screens.

### Deploy options
- **Netlify Drop**: drag the `dist/` folder to https://app.netlify.com/drop
- **Connect Git**: push this folder to GitHub and connect it in Netlify. Build command: `npm run build`, Publish dir: `dist`.
