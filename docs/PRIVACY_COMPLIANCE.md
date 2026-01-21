# Privacy & Permissions Compliance (React Native)

This app uses camera, microphone, speech recognition, and biometric auth. The purpose strings are defined in `app.json`.

## Required Purpose Strings (iOS)
- `NSCameraUsageDescription` — facial mimicry + vision training
- `NSMicrophoneUsageDescription` — speech practice + voice commands
- `NSSpeechRecognitionUsageDescription` — speech transcription
- `NSFaceIDUsageDescription` — biometric sign-in

## Android Permissions
- `CAMERA`
- `RECORD_AUDIO`
- `USE_BIOMETRIC`

## Data Handling
- API keys stored locally in `expo-secure-store` (dev only).
- Production uses the backend proxy in `BACKEND_SETUP.md`.
- User profiles stored locally via `AsyncStorage`.
- AI requests are sent only to your backend and AI providers.

## Release Checklist
- Verify permission prompts on physical device.
- Confirm API keys are not hard-coded in the bundle.
- Validate privacy policy text before store submission.
