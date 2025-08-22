# Maplewood Scheduler (Vite + React + TS)

[![CI](https://github.com/OWNER/maplewood-scheduler/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/maplewood-scheduler/actions/workflows/ci.yml)

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

### Deploy options
- **Netlify Drop**: drag the `dist/` folder to https://app.netlify.com/drop
- **Connect Git**: push this folder to GitHub and connect it in Netlify. Build command: `npm run build`, Publish dir: `dist`.

## Continuous Integration

This project uses [GitHub Actions](.github/workflows/ci.yml) to run `npm run typecheck` and `npm test` on pushes to and pull requests targeting `main`.
