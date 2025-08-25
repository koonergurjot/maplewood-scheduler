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
2. Include an `Authorization: Bearer <token>` header on requests to `/api/analytics`, `/api/analytics/export`, `/api/collective-agreement/upload`, and `/api/collective-agreement/search`.
3. Requests missing or providing an invalid token will receive `401 Unauthorized`.

Example:

```bash
export ANALYTICS_AUTH_TOKEN=mys3cret
npm run server
```

Example request:

```bash
curl -H "Authorization: Bearer $ANALYTICS_AUTH_TOKEN" \
  "http://localhost:3000/api/collective-agreement/search?query=benefits"
```

## Analytics API options

Analytics endpoints accept an optional `overtimeThreshold` query parameter to
control how overtime hours are calculated. The default threshold is **8** hours.

Example:

```bash
curl -H "Authorization: Bearer $ANALYTICS_AUTH_TOKEN" \
  "http://localhost:3000/api/analytics?overtimeThreshold=10"
```

## Bulk Award Helpers

Bulk Award Helpers let you award several open shifts in a single action.

- **Select multiple open shifts:** In the schedule view, choose all of the open shifts you want to award.
- **Apply a shared message and reason:** Enter one message and reason that will be attached to every selected shift.
- **Validation and overrides:** Each shift is validated for conflicts or eligibility. You can override warnings or remove problematic shifts before finalizing.

### Workflow
1. Use the checkboxes to select the open shifts.
2. Click **Award Selected**.
3. Provide the shared message and reason.
4. Review validations and override or skip any shifts that fail.
5. Submit to award the remaining shifts.

## Responsive design

- `src/styles/responsive.css` defines a tablet breakpoint at **≤900px** where tables collapse and form rows stack, and a phone breakpoint at **≤600px** that further reduces the calendar to a single column.
- Use the `responsive-table` class on tables and `form-row` for grouped form inputs to stack vertically on narrow screens.

### Deploy options

- **Netlify Drop**: drag the `dist/` folder to https://app.netlify.com/drop
- **Connect Git**: push this folder to GitHub and connect it in Netlify. Build command: `npm run build`, Publish dir: `dist`.
