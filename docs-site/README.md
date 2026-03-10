# AURA Documentation Site

This directory contains the AURA documentation portal that is deployed to Vercel from the repository subdirectory.

## Local Usage

```bash
npm ci
npm run build
npm run serve
```

## Regenerate Code Reference

```bash
npm run generate:code-reference
```

The generated outputs are:

- `docs/code-reference/generated-files.md`
- `static/generated/code-reference.json`

## Vercel Project Settings

- Repository: `EGIntegrations/AURA-mobile`
- Root Directory: `docs-site`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `build`
