---
title: CI/CD
sidebar_label: CI/CD
---

# CI/CD

## GitHub Actions Workflow

File: `.github/workflows/ci.yml`

### Trigger Conditions

- Push to `main`, `master`, or `codex/**`
- Any pull request

### Validation Steps

1. Checkout repository
2. Setup Node 20 with npm cache
3. Install dependencies (`npm ci`)
4. Typecheck (`npm run typecheck`)
5. Basic secret scan using regex for potential API key patterns

### Secret Scan Behavior

The workflow fails if possible key-like values matching `sk-...` patterns are found in tracked files (excluding `.git` and `node_modules`).

## Docs Site Build Guardrail

Before merging docs changes:

- Run `npm run build` from `docs-site`
- Confirm generated code reference artifacts are current
- Confirm no user-visible default template branding remains
