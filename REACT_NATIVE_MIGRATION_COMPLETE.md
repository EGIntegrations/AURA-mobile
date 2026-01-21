# React Native Refactor Summary

The project now uses React Native + Expo as the single production codebase.
Legacy Swift assets are archived in `legacy/swift-ios` for reference only.

## Feature Coverage
- Authentication, demo roles, biometric shortcut sign-in
- Emotion recognition game with streak + progression
- Speech practice with live transcription
- Facial mimicry with camera + OpenAI Vision
- Vision training (live emotion feedback)
- AI conversation scenarios with audio replies
- Voice commands for hands-free navigation
- Admin dashboard for supervised learners + report sharing
- Progress analytics with achievements

## Key Directories
- `src/screens` — all app screens
- `src/services` — auth, AI, audio, progression, monitoring
- `src/assets/emotions` — local emotion image set
- `legacy/swift-ios` — archived Swift project

## Next Steps
- Run `npm install` (adds the `buffer` polyfill dependency).
- Configure OpenAI + ElevenLabs keys in the app.
- Or configure the backend proxy with `BACKEND_SETUP.md`.
- Build with EAS dev client for device testing.
