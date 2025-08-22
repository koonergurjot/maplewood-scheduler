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

## Responsive design
- Mobile breakpoint at **600px** is defined in `src/styles/responsive.css`.
- Use the `responsive-table` class on tables and `form-row` for grouped form inputs to stack vertically on narrow screens.

### Deploy options
- **Netlify Drop**: drag the `dist/` folder to https://app.netlify.com/drop
- **Connect Git**: push this folder to GitHub and connect it in Netlify. Build command: `npm run build`, Publish dir: `dist`.
