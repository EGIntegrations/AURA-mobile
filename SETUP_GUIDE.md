# AURA React Native Setup Guide

## Requirements
- Node.js 18+
- Expo CLI (via `npx expo`)
- iOS Simulator or Android Emulator (device recommended for camera/voice)

## Install
```bash
npm install
```

## Run
```bash
npm run ios
npm run android
```

For dev-client builds, start Metro with:
```bash
npx expo start --dev-client
```

## API Keys
1. Launch the app.
2. Open **API Keys** from the dashboard.
3. Save OpenAI + ElevenLabs keys (stored via `expo-secure-store`).

For production, configure the backend proxy instead of local keys:
```
eas secret:create --name BACKEND_BASE_URL --value https://your-api.example.com
```

For local development with a backend:
```bash
BACKEND_BASE_URL=https://your-api.example.com npx expo start --dev-client
```

## Voice + Camera Permissions
The app requests camera, microphone, and speech recognition permissions on first use. Make sure you approve:
- Camera (mimicry + vision training)
- Microphone (speech + voice commands)
- Speech Recognition (voice commands + speech practice)

## EAS Build
```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

## Legacy Swift App
The prior Swift implementation is archived in `legacy/swift-ios` and is no longer used.
