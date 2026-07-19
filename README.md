# Soccer Score

A soccer/football match scorer. React + Vite + TypeScript, client-side only (`localStorage`), no backend.

## Run locally

```bash
npm install
npm run dev
```

## Test

```bash
npm run test        # unit/logic tests (Vitest)
npm run build       # required once before e2e tests, so preview serves the current build
npm run test:e2e    # visual regression tests (Playwright)
```

## Format

```bash
npm run format        # write
npm run format:check  # check only
```

## Deploy

Push to `main` — a GitHub Actions workflow builds and deploys `dist/` to GitHub Pages automatically. See `.github/workflows/deploy.yml`.
