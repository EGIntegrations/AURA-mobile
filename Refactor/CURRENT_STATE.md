# AURA Repository Current-State Audit

Date: March 17, 2026  
Scope: Current implementation only (no refactor actions in this document)

## 1) Repository Reality Snapshot

- Primary active app: React Native + Expo app in `src/` with entry in `App.tsx`.
- Active docs portal: Docusaurus site in `docs-site/`.
- Archived/non-active implementation: `legacy/swift-ios/` and `AI/AITherapyManager.swift`.
- CI present via GitHub Actions (`.github/workflows/ci.yml`) with install, typecheck, and basic secret scan.

## 2) Deployment Details

### Mobile App Delivery

- Build system: Expo EAS (`eas.json`).
- Profiles:
  - `development`: dev client, internal distribution; Android outputs APK.
  - `preview`: internal distribution.
  - `production`: iOS image + Android app bundle.
- Mobile app config source:
  - Static base config: `app.json`
  - Runtime env stitching: `app.config.js`

### Documentation Site Delivery

- Platform: Vercel (documented in `docs-site/README.md` and `docs-site/docs/deployment.md`).
- Expected Vercel setup:
  - Repo: `EGIntegrations/AURA-mobile`
  - Root directory: `docs-site`
  - Install: `npm ci`
  - Build: `npm run build`
  - Output: `build`
- Docs build includes code-reference generation (`npm run generate:code-reference`).

### Continuous Integration

- Workflow: `.github/workflows/ci.yml`
- Trigger:
  - Push to `main`, `master`, `codex/**`
  - Pull requests
- Steps:
  - `npm ci`
  - `npm run typecheck`
  - Regex-based scan for `sk-...` style secrets

## 3) Environment Variables and Config Inputs

## Env vars referenced directly in active code

| Variable | Where | Purpose | Notes |
| --- | --- | --- | --- |
| `BACKEND_BASE_URL` | `app.config.js` | Injects backend base URL into `expo.extra.backendBaseUrl` | Only `process.env.*` variable used in active app code |

## Runtime config keys (not env vars, but behavior-critical)

| Key | Where | Purpose | Current default |
| --- | --- | --- | --- |
| `expo.extra.backendBaseUrl` | `app.json` + runtime constants | Backend proxy enablement | Empty string |
| `expo.extra.allowOfflineAuthInProduction` | `app.json` + `AuthenticationService` | Allows local auth in prod if true | `true` |

## Backend-side env assumptions (documented contract)

These are documented in `docs/BACKEND_SETUP.md` and `docs-site/docs/backend-api-contract.md` and are assumed to exist in the backend service, not this mobile repo runtime:

- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`
- `JWT_SECRET`

## 4) Domain and Endpoint Assumptions

- Privacy policy URL in mobile config:
  - `https://aura-site-3l69adydm-egod21s-projects.vercel.app/privacy-policy`
- Docs site base URL:
  - `https://aura-site-3l69adydm-egod21s-projects.vercel.app`
- Repository links hardcoded in docs config:
  - `https://github.com/EGIntegrations/AURA-mobile`
- Backend domain behavior:
  - In non-dev builds, backend URL must be HTTPS (`BackendClient` rejects non-HTTPS URLs).
- External provider endpoints currently used in direct mode:
  - OpenAI: `api.openai.com`
  - ElevenLabs: `api.elevenlabs.io`

## 5) Integrations

## External services

- OpenAI APIs (chat, vision via chat completions, TTS, image generation, transcription).
- ElevenLabs APIs (text-to-speech, voice list).
- Optional custom backend for auth + AI proxy (`/auth/*`, `/ai/*` contract).
- Vercel for docs hosting.
- Expo EAS for mobile builds.
- GitHub Actions for CI validation.

## Core libraries/platform integrations

- Expo modules: camera, AV, speech recognition, local auth, secure store, speech.
- React Navigation native stack.
- Zustand auth store.
- Axios networking.
- AsyncStorage + SecureStore persistence.

## 6) Authentication and Authorization Current State

- Two auth modes:
  - Backend-assisted auth when backend URL is configured.
  - Local/offline auth (allowed in dev and controlled by `allowOfflineAuthInProduction` in prod).
- Login and signup can fall back to local auth when backend fails and offline auth is allowed.
- Biometric sign-in:
  - Uses expo local authentication.
  - In non-dev, requires backend configuration.
- Auth token handling:
  - Stored in SecureStore (`aura_backend_token`).
  - Attached as bearer token in backend requests.
  - Cleared on HTTP 401.
- Role model:
  - `student`, `teacher`, `parent`, `admin`.
  - Admin dashboard access requires role + (`__DEV__` or backend configured).

## 7) Data Storage Current State

## Secure storage

- Backend token
- OpenAI key
- ElevenLabs key
- Biometric state + username
- Per-user credential payloads (`aura_user_credentials_v1_*`)

## Async storage

- User records and current user session
- AI consent flag
- UX flags for skipping instructions

## 8) Active Route Surface

Registered routes in `RootNavigator`:

- `Auth`
- `Dashboard`
- `Game`
- `SpeechPractice`
- `Mimicry`
- `Conversation`
- `Progress`
- `AdminDashboard`
- `APIKeyConfig`
- `VoiceCommands`
- `Settings`

Unrouted screen file present:

- `VisionTrainingScreen.tsx` exists but is not currently registered in `RootNavigator`.

## 9) Current Risks and Gaps

1. Production auth posture is permissive by default: `allowOfflineAuthInProduction` is set to `true`.
2. Local profile/progress data remains in AsyncStorage (not encrypted at rest like SecureStore).
3. Mimicry/Vision confidence values are simulated with `Math.random`, reducing measurement reliability.
4. Vision training screen exists but is unreachable from current navigator registration.
5. Client supports direct provider key mode, increasing key exposure risk on end-user devices.
6. Password hashing is iterative SHA-256 (not memory-hard KDF).
7. CI coverage is minimal (typecheck + basic OpenAI-style secret regex only; no test suite execution).
8. `ecosystem.config.js` references `App.tsx` for PM2, which appears non-standard for Expo runtime use.

