---
title: Mobile App
sidebar_label: Mobile App
---

# Mobile App

## Core Stack

- React Native 0.76.9
- Expo 52
- React Navigation (native stack)
- Zustand (auth state store)
- Axios (HTTP)
- Expo modules for camera, biometrics, AV, speech, secure storage

## Entry and Navigation

- App entry: `App.tsx`
- Root navigation: `src/navigation/RootNavigator.tsx`
- Auth gate: unauthenticated users see `AuthenticationScreen`; authenticated users get full stack.

## Screen Inventory

- `AuthenticationScreen`: sign-in/up, biometric entry, offline/backend mode messaging
- `DashboardScreen`: launch point for all training modules and settings
- `GameScreen`: timed emotion recognition rounds
- `SpeechPracticeScreen`: voice-driven emotion naming practice
- `MimicryScreen`: camera mimicry rounds with AI/fallback detection
- `ConversationScreen`: scenario-based coach chat (text/talk)
- `VisionTrainingScreen`: continuous camera analysis feedback mode
- `ProgressScreen`: level/XP, history, achievements, mastery
- `AdminDashboardScreen`: supervised users, report/resource sharing
- `APIKeyConfigScreen`: direct-key configuration and status
- `VoiceCommandScreen`: speech command navigation shortcuts
- `SettingsScreen`: biometrics and AI processing consent

## State and Session Updates

- Auth/global user state is held in Zustand (`useAuthStore`).
- Session results update `currentUser.progress` and persist via `AuthenticationService.updateUserProgress`.
- `ProgressionService.applyProgression` recomputes level, unlocked emotions, and achievements.

## Key Mobile Config

- Expo config: `app.json`
- Runtime env stitching: `app.config.js` (`BACKEND_BASE_URL`)
- Build profiles: `eas.json`
