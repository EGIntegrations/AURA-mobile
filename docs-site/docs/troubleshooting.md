---
title: Troubleshooting
sidebar_label: Troubleshooting
---

# Troubleshooting

## Auth Errors

### "Server authentication is required in production"

Cause:

- Production build with offline auth disabled and no backend URL configured.

Fix:

- Configure `BACKEND_BASE_URL` via EAS secret and rebuild.

### "Your session expired. Please sign in again."

Cause:

- Backend returned HTTP 401; token was cleared by client.

Fix:

- Re-authenticate and confirm backend token validity window.

## AI Feature Failures

### Conversation/vision unavailable

Cause:

- Missing keys in direct mode, backend proxy outage, or provider errors.

Fix:

- Confirm backend endpoint health and provider credentials.
- In direct mode, confirm valid keys are saved in API Key Configuration.

## Camera/Microphone/Speech Issues

Cause:

- Permission denied at OS level.

Fix:

- Re-enable permissions in device settings and relaunch app.

## Docs Build Failures

### Missing generated code reference page

Fix:

- Run `npm run generate:code-reference` then `npm run build`.

### Broken links

Fix:

- Validate sidebar IDs and doc slugs against actual files.
