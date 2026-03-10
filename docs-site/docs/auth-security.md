---
title: Auth and Security
sidebar_label: Auth and Security
---

# Auth and Security

## Authentication Modes

1. Backend-authenticated mode (recommended): mobile sends credentials to backend auth endpoints.
2. Local/offline mode (allowed by config): local credentials are verified on-device.

## Local Credential Handling

- Credential metadata and profile records are stored in `AsyncStorage`.
- Password hash/salt secrets are persisted in `expo-secure-store` under versioned keys.
- Password hashing strategy uses SHA-256 with versioned iterative derivation (`v2`, 12,000 iterations).

## Biometric Rules

- Biometrics require enrolled device hardware.
- Non-dev builds require backend configuration for biometric sign-in flow.
- Biometric username and enabled flag are stored in secure storage.

## Backend Security Controls in Client

- HTTPS required for production backend URL.
- Auth token is attached to backend requests automatically.
- 401 responses clear stale tokens to prevent reuse.

## Key Storage

- OpenAI key: secure storage (`aura_openai_key`)
- ElevenLabs key: secure storage (`aura_elevenlabs_key`)
- Backend token: secure storage (`aura_backend_token`)

## Access Controls by Role

`UserRole` values:

- `student`
- `teacher`
- `parent`
- `admin`

Permissions are role-derived in `AuthenticationService.getDefaultPermissions`.
