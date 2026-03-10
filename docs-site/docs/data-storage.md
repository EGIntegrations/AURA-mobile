---
title: Data and Storage
sidebar_label: Data and Storage
---

# Data and Storage

## Storage Locations

### AsyncStorage

- `aura_users`: serialized user records
- `aura_current_user`: active session user snapshot
- `aura_ai_processing_consent_v1`: consent flag
- feature UX flags (examples):
  - `@speech_practice_skip_instructions`
  - `@mimicry_skip_instructions`

### SecureStore

- `aura_backend_token`
- `aura_openai_key`
- `aura_elevenlabs_key`
- `aura_biometric_username`
- `aura_biometric_enabled`
- `aura_user_credentials_v1:{userId}`

## Main Progress Model

`PlayerProgress` tracks:

- cumulative scoring (`totalScore`, `totalCorrectAnswers`, `totalQuestions`)
- progression state (`currentLevel`, `unlockedEmotions`, `achievementsUnlocked`)
- streak metrics (`currentStreak`, `bestStreak`)
- per-feature history arrays (`sessionHistory`, `speechPracticeHistory`, `mimicryHistory`, `conversationHistory`)

## Serialization Behavior

- Date fields are serialized to ISO strings for persistence.
- `AuthenticationService` handles date rehydration on read.
- Credentials are intentionally excluded from AsyncStorage payloads after secure-store migration.
