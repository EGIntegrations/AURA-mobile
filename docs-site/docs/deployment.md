---
title: Deployment (EAS + Vercel)
sidebar_label: Deployment (EAS + Vercel)
---

# Deployment (EAS + Vercel)

## Mobile Delivery (Expo EAS)

Build profiles are defined in `eas.json`:

- `development`: internal distribution, dev client
- `preview`: internal distribution
- `production`: iOS image + Android app bundle

### Backend URL Injection

Set backend base URL via EAS secret:

```bash
eas secret:create --name BACKEND_BASE_URL --value https://your-api.example.com
```

`app.config.js` injects this value into Expo extra config consumed by `BackendClient`.

## Documentation Site Deployment on Vercel

Create a Vercel project connected to:

- Repository: `EGIntegrations/AURA-mobile`
- Root Directory: `docs-site`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `build`

### Rollback Notes

1. In Vercel dashboard, open the project deployment history.
2. Promote the last known-good deployment to production.
3. If rollback is due to content error, revert the docs commit and push.
4. Re-run deployment checks (`npm run build`) before re-promoting.

## Local Docs Validation Commands

```bash
cd docs-site
npm ci
npm run build
npm run serve
```
