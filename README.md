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

## State management

Employees, vacancies and user settings are managed through a React context exposed from `src/state/AppContext.tsx`. Components can access and mutate this data by using the `useAppContext` hook.

```tsx
import { useAppContext } from './state/AppContext';

const { employees, vacancies, settings } = useAppContext();
```

### Deploy options
- **Netlify Drop**: drag the `dist/` folder to https://app.netlify.com/drop
- **Connect Git**: push this folder to GitHub and connect it in Netlify. Build command: `npm run build`, Publish dir: `dist`.
