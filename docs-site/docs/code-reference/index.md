---
title: Code Reference
sidebar_label: Index
---

# Code Reference

This section is generated from repository files to keep coverage systematic across active and archived code.

## Generated Artifacts

- JSON: `/generated/code-reference.json`
- Doc page: [Generated File Inventory](./generated-files)

## Regeneration Command

From `docs-site`:

```bash
npm run generate:code-reference
```

The generator scans these source areas:

- Active: `src`, `docs`, `app*.json/js`, `package.json`, `eas.json`, `.github/workflows`
- Archived: `legacy/swift-ios`, `AI`

It extracts exported symbols where applicable and records per-file responsibility summaries with source links.
