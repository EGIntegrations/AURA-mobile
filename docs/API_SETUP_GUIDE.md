# AURA API Setup Guide (React Native)

## 1) Decide Key Strategy
### Production (Recommended)
Use the backend proxy so end users never manage API keys. Follow `BACKEND_SETUP.md`.

### Development (Direct Keys)
- Create an OpenAI key at https://platform.openai.com/api-keys
- Optionally create an ElevenLabs key at https://elevenlabs.io/app/settings/api-keys

## 2) Configure in App (Dev Only)
1. Launch the app.
2. Open **API Keys** from the dashboard.
3. Paste keys and tap **Save**.

Keys are stored locally in `expo-secure-store` via `APIKeyService`.

## 3) Verify
- Start a conversation or mimicry session.
- If keys are missing and backend is disabled, the app falls back to system TTS.

## Troubleshooting
- Ensure keys are active and not expired.
- OpenAI requests require internet access on device.
- If voice features fail, re-approve microphone permissions.
