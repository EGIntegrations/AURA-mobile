---
title: Architecture
sidebar_label: Architecture
---

# Architecture

## High-Level Topology

AURA has three major runtime boundaries:

1. Mobile client (Expo/React Native): UI, local state, permissions, and feature workflows.
2. Backend API (optional but recommended for production): auth and AI proxy endpoints.
3. AI providers: OpenAI and ElevenLabs (direct or backend-mediated).

## Client Subsystems

- Navigation: `src/navigation/RootNavigator.tsx`
- UI screens: `src/screens/*`
- Service layer: `src/services/*`
- Auth state: Zustand store (`src/store/authStore.ts`)
- Shared contracts: `src/types/*`
- Theme/UI primitives: `src/theme/*`, `src/components/*`

## Request and Identity Model

- `BackendClient` reads base URL from `expo.extra.backendBaseUrl`.
- Auth token persistence: `BackendAuthService` (`expo-secure-store`).
- Backend requests include `Authorization: Bearer <token>` when present.
- 401 responses clear token and force re-auth flow.

## Security Boundaries

- Sensitive local credentials are stored in `expo-secure-store`.
- User profile and progress records are stored in `AsyncStorage`.
- In production, backend URL must be HTTPS (`BackendClient` enforcement).

## Primary User Flows

1. Authentication (username/password and optional biometrics)
2. Emotion game (timed recognition rounds)
3. Speech practice (speech recognition + manual fallback)
4. Facial mimicry and vision training (camera + AI analysis)
5. Conversation coaching (scenario-driven AI/fallback messaging)
6. Progress and achievements tracking
7. Admin supervision for teacher/parent/admin roles
