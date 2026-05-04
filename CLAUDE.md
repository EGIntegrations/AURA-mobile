# EGI Claude Instructions

## Who We Are
- EGI is a software company specializing in custom software, integrations, automation, internal platforms, and client delivery systems.
- EGI owns active engineering for EGI-built systems: discovery, architecture, implementation, test coverage, CI, dev environments, and most staging workflows.
- Production operations move to Anchor after handoff. Anchor becomes responsible for monitoring, logging, alerting, secrets, backups, security operations, and incident response.

## Claude Operating Model
- Use the Boris/Claude Code pattern: explore first, make a short plan, implement surgically, verify, then summarize evidence.
- Treat context as a scarce resource. Read the smallest set of files needed, prefer `rg` over broad scans, and summarize findings before loading more.
- Ask clarifying questions when requirements are ambiguous, production-impacting, security-sensitive, or likely to create rework.
- Push back on overbuilt solutions. Prefer the smallest durable implementation that satisfies the actual goal.
- Do not silently choose between materially different interpretations. State the assumption or ask.
- Use subagents only for bounded research or independent work when the current task benefits from parallelism.

## Engineering Standards
- Match the existing project style before introducing new patterns.
- Make surgical changes. Do not refactor unrelated code, reformat unrelated files, or remove pre-existing dead code unless asked.
- Add or update tests for changed behavior whenever the project has a test harness.
- Keep APIs, schemas, and operational contracts small and explicit.
- Prefer clear names and boring architecture over clever abstractions.
- Document non-obvious operational behavior near the code and in the project docs.

## CI/CD And Deployment
- EGI CI/CD source of truth: `/Users/elliottgodwin/Developer/egi-ci:cd`.
- For new EGI projects, consult:
- `/Users/elliottgodwin/Developer/egi-ci:cd/docs/how-to-bootstrap-new-project.md`
- `/Users/elliottgodwin/Developer/egi-ci:cd/templates/app-repo`
- `/Users/elliottgodwin/Developer/egi-ci:cd/templates/ops-repo`
- `/Users/elliottgodwin/Developer/egi-ci:cd/provider-adapters`
- Use GitOps-first deployments with PR-based promotion when the target supports it.
- Standard environments are `dev`, `staging`, and `prod`.
- CI/CD handles build, test, deploy, and promotion workflow. It is not the source of runtime truth.

## Operational Readiness
- Runtime truth belongs in the operational stack, not in deployment metadata.
- Build every production-bound system with:
- A `/health` endpoint or equivalent service health check.
- Structured logs accessible through stdout or documented files.
- Metrics, uptime checks, and alert-routing requirements.
- Backup and restore requirements when stateful.
- Secrets documentation without exposing secret values.
- A runbook and ownership notes before handoff.
- Anchor handoff readiness references live in `/Users/elliottgodwin/Developer/egi-ci:cd/handoff` and `/Users/elliottgodwin/Developer/comp-migration`.

## Security
- Never commit secrets, tokens, private keys, customer data, or generated credentials.
- Use named human accounts and least-privilege access. Avoid shared logins except documented break-glass access.
- Production secrets belong in the approved secrets system, not `.env` files committed to repos.
- If a requested change weakens auth, authorization, backup safety, auditability, or production rollback, stop and explain the risk.

## Verification
- Before changing code, identify how success will be verified.
- Prefer project-native checks: tests, type checks, lint, build, migration dry-runs, health checks, or targeted manual verification.
- If a command cannot be run, say why and provide the next best verification path.
- Summaries must include changed files, verification performed, and unresolved risks.

## Claude Memory Notes
- Keep this file short and project-shared. Put detailed project docs in normal repo documentation and import them only when useful.
- If the project adds deeper instructions, use nested `CLAUDE.md` files in subdirectories or imports such as `@docs/architecture.md`.
- Do not store personal preferences here; use user-level Claude memory for that.
