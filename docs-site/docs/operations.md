---
title: Operations
sidebar_label: Operations
---

# Operations

## Day-to-Day Documentation Workflow

From `docs-site`:

```bash
npm run generate:code-reference
npm run build
npm run serve
```

`generate:code-reference` refreshes export inventory content before build.

## Recommended Release Checklist

1. Regenerate code reference.
2. Confirm endpoint contract page matches `src/services` usage.
3. Confirm auth/offline/backend behavior is still accurate against current code.
4. Build docs site locally.
5. Verify homepage and docs navigation are branded for AURA.
6. Push to default branch and validate Vercel deployment.

## Space Management

After successful local docs validation, run:

```bash
bash ./scripts/cleanup-local-space.sh
```

This removes heavy local dependency/artifact directories so Vercel can rebuild from source.

## Monitoring Suggestions

- Monitor backend 401/timeout rates for auth and AI endpoints.
- Track app session completion and fallback-mode frequency.
- Track docs deploy success/failure in Vercel.
