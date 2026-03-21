# Future-State Notes (Documentation Only)

Date: March 17, 2026  
Intent: Forward-looking notes derived from current repository state; no implementation changes in this file.

## 1) Guardrails for Any Future Refactor

- Preserve AURA branding and existing product identity.
- Preserve existing route names unless a deliberate migration plan is approved.
- Preserve existing infrastructure entry points (Expo EAS, Vercel docs deployment, optional backend contract) until replacements are operational.
- Treat `src/` React Native implementation as the active system of record.

## 2) Future-State Direction Notes

## Auth and Security

- Define a strict production policy for offline/local auth behavior and document when it is allowed.
- Consider moving from iterative SHA-256 password derivation to a memory-hard KDF strategy (backend-assisted where applicable).
- Centralize AI consent enforcement at service-entry level (not only at screen level) to reduce bypass risk.

## Backend and Integration Model

- Confirm long-term model: backend-only provider access vs mixed backend/direct-key mode.
- If backend-only becomes target state, keep `/auth/*` and `/ai/*` contract versioned and published.
- Add explicit backend health/error observability expectations for timeout, 401, and provider failures.

## Deployment and Domains

- Replace temporary/generated Vercel domain usage with controlled production domain(s) for docs/privacy endpoints.
- Keep mobile and docs deployment runbooks synchronized with actual CI/CD behavior.
- Maintain a single release checklist covering app config, permissions, privacy links, and backend URL injection.

## Product Surface and Navigation

- Decide explicit status of `VisionTrainingScreen` (activate in navigator or archive as non-routable).
- Reconcile documentation inventory with live route registration to avoid stale feature maps.

## Data and Analytics

- Formalize retention and lifecycle policy for local progress data and supervised learner metadata.
- Define telemetry requirements for fallback-mode frequency and AI failure paths.

## 3) Documentation Debt to Track

1. Status reports in `docs/` include historical statements (e.g., July 2025 progress language) that may drift from current code.
2. Some docs mention implementation details that are now legacy or aspirational; annotate clearly as historical or planned.
3. Keep `docs-site/docs/mobile-app.md` and `RootNavigator` in lockstep to avoid route mismatches.

## 4) Suggested Decision Records (ADR-style)

- ADR: Production auth mode policy (`allowOfflineAuthInProduction` behavior by environment).
- ADR: Provider key ownership model (device-stored direct keys vs backend-only custody).
- ADR: Public domain strategy for docs + privacy policy URLs.
- ADR: Minimum CI quality gates beyond typecheck.

