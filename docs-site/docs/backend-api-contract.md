---
title: Backend API Contract
sidebar_label: Backend API Contract
---

# Backend API Contract

The mobile app expects the following backend contract when `BACKEND_BASE_URL` is configured.

## Base URL Resolution

`BackendClient` loads the base URL from:

1. `process.env.BACKEND_BASE_URL` at build-time via `app.config.js`
2. fallback to `app.json` -> `expo.extra.backendBaseUrl`

Outside dev builds, non-HTTPS base URLs are rejected.

## Authentication Endpoints

| Method | Path | Expected Response |
| --- | --- | --- |
| `POST` | `/auth/register` | `{ token }` |
| `POST` | `/auth/login` | `{ token }` |
| `POST` | `/auth/biometric` | `{ token }` |

## AI Proxy Endpoints

| Method | Path | Expected Response |
| --- | --- | --- |
| `POST` | `/ai/chat` | `{ message }` |
| `POST` | `/ai/vision` | `{ message }` |
| `POST` | `/ai/tts` | `{ audioBase64, mimeType? }` |
| `POST` | `/ai/image` | `{ images: string[] }` |
| `POST` | `/ai/elevenlabs-tts` | `{ audioBase64, mimeType? }` |
| `POST` | `/ai/elevenlabs-voices` | `[{ voice_id, name }]` |

## Auth Header Behavior

- If a token exists in `BackendAuthService`, requests include `Authorization: Bearer <token>`.
- On HTTP 401, the token is cleared and sign-in is required again.

## Suggested Backend Environment Variables

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `JWT_SECRET`
