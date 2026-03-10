---
title: Services and Integrations
sidebar_label: Services and Integrations
---

# Services and Integrations

## Internal Services (`src/services`)

- `AuthenticationService`: local user lifecycle, hashing, hydration, progress persistence, backend auth fallback.
- `BackendClient`: base URL resolution, auth header wiring, timeout and error handling.
- `BackendAuthService`: secure token read/write/clear.
- `BiometricService`: enrollment and biometric sign-in gate logic.
- `APIKeyService`: secure local OpenAI and ElevenLabs key management.
- `OpenAIService`: chat, vision, TTS, image generation, transcription.
- `ElevenLabsService`: speech synthesis and voice list.
- `ConversationService`: scenario state, coach responses, fallback behavior, summary generation.
- `CurriculumEngine`: question queue, session scoring metadata.
- `ProgressionService`: unlocks, leveling, achievements.
- `UserMonitoringService`: emotion reading and engagement/frustration indicators.
- `AudioService`: speech output and SFX playback.
- `ConsentService`: AI processing consent persistence.
- `ImageDatasetService` and `ImageGenerationService`: local/generative emotion image sources.

## Provider Integrations

### OpenAI (direct mode)

- `POST https://api.openai.com/v1/chat/completions`
- `POST https://api.openai.com/v1/audio/speech`
- `POST https://api.openai.com/v1/images/generations`
- `POST https://api.openai.com/v1/audio/transcriptions`

### ElevenLabs (direct mode)

- `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}`
- `GET https://api.elevenlabs.io/v1/voices`

## Fallback Strategy

When AI/provider calls fail or required keys are absent, AURA degrades to fallback messaging and platform speech behaviors where possible, rather than hard-failing every user flow.
