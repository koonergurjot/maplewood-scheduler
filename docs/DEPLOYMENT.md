# Deployment

## Local

```bash
npm install
npm run build
npm run preview
```

## Docker

Docker deployment is not currently supported because this repository does not
include a Dockerfile. Use one of the other options below, or create a custom
Dockerfile tailored to your environment if containerization is required.

## Netlify

1. Connect the repo.
2. Set build command `npm run build` and publish dir `dist`.

## Vercel

1. Import the project.
2. Install dependencies and deploy with defaults.

## GitHub Pages

1. Run `npm run build`.
2. Deploy the `dist/` folder via GitHub Pages.
