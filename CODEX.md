# AURA React Native Engineering Codex

## Current Status
- React Native + Expo is the single source of truth.
- Legacy Swift/iOS assets are archived in `legacy/swift-ios`.
- Core experiences (auth, game, speech, mimicry, conversation, admin, progress) are implemented in `src/`.

## Project Structure
```
AutismTrainerApp/
├── App.tsx
├── app.json
├── src/
│   ├── assets/                # Emotion images + audio
│   ├── components/            # Glass UI, backgrounds
│   ├── navigation/            # Root stack navigator
│   ├── screens/               # All app screens
│   ├── services/              # Auth, AI, audio, progression
│   ├── store/                 # Zustand auth store
│   └── types/                 # Shared TypeScript models
└── legacy/swift-ios/           # Archived Swift implementation
```

## Core Workflows
- **Authentication** (`src/services/AuthenticationService.ts`)
  - Local user store via AsyncStorage with salted hashes.
  - Demo users seeded on first run.
  - Biometric shortcut sign-in supported.
  - Backend proxy auth tokens supported.
- **Emotion Recognition Game** (`src/screens/GameScreen.tsx`)
  - 8-question rounds, timer, streak bonuses.
  - Progression handled in `ProgressionService`.
- **Speech Practice** (`src/screens/SpeechPracticeScreen.tsx`)
  - Voice transcription via `@react-native-voice/voice`.
  - Manual fallback answers and audio feedback.
- **Facial Mimicry** (`src/screens/MimicryScreen.tsx`)
  - Camera capture + OpenAI Vision for emotion detection.
- **Vision Training** (`src/screens/VisionTrainingScreen.tsx`)
  - Continuous emotion feedback + engagement tracking.
- **AI Conversation** (`src/screens/ConversationScreen.tsx`)
  - Scenario-based conversations with OpenAI + ElevenLabs.
- **Voice Commands** (`src/screens/VoiceCommandScreen.tsx`)
  - Hands-free routing to core activities.
- **Admin Dashboard** (`src/screens/AdminDashboardScreen.tsx`)
  - Supervised learner management + shareable reports.
- **Progress & Achievements** (`src/screens/ProgressScreen.tsx`)
  - Level, stats, mastery, achievements.

## Assets & Data
- Emotion images live in `src/assets/emotions`.
- Audio feedback assets live in `src/assets/sounds`.
- API keys are stored in `expo-secure-store` via `APIKeyService`.
- Backend proxy base URL comes from `app.config.js` (`BACKEND_BASE_URL`).

## Manual Test Plan
1. Launch app, confirm demo accounts load.
2. Sign in as `teacher1/demo`, open Admin Dashboard.
3. Start Emotion Recognition, complete session, verify Progress updates.
4. Run Speech Practice, test voice + manual answer flow.
5. Run Mimicry + Vision Training to validate camera + OpenAI.
6. Start AI Conversation and end session, verify summary stored.
7. Trigger Voice Commands and confirm navigation.

## Notes
- Voice features require microphone + speech permissions on device.
- OpenAI/ElevenLabs keys are required for AI features.
- Legacy Swift app is for reference only.
