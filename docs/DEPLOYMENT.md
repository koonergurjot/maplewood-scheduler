# Deployment

## Local

```bash
npm install
npm run build
npm run preview
```

## Docker

```bash
docker build -t maplewood-scheduler .
docker run -p 3000:3000 maplewood-scheduler
```

## Netlify

1. Connect the repo.
2. Set build command `npm run build` and publish dir `dist`.

## Vercel

1. Import the project.
2. Install dependencies and deploy with defaults.

## GitHub Pages

1. Run `npm run build`.
2. Deploy the `dist/` folder via GitHub Pages.
