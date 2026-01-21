# Backend Setup (AWS Lambda + API Gateway)

This app is designed to run without user-provided API keys by proxying all AI calls through your backend.

## 1) Create Secrets
Create secrets in AWS Secrets Manager:
- `OPENAI_API_KEY`
- `ELEVENLABS_API_KEY`

## 2) Deploy API Gateway + Lambda
Create a single API with these endpoints (Lambda handlers can be split if preferred):

**Auth**
- `POST /auth/register` → `{ token }`
- `POST /auth/login` → `{ token }`
- `POST /auth/biometric` → `{ token }`

**AI Proxy**
- `POST /ai/chat` → `{ message }`
- `POST /ai/vision` → `{ message }`
- `POST /ai/tts` → `{ audioBase64, mimeType }`
- `POST /ai/elevenlabs-tts` → `{ audioBase64, mimeType }`
- `POST /ai/elevenlabs-voices` → `[{ voice_id, name }]`
- `POST /ai/image` → `{ images: [dataUrl] }`

## 3) Lambda Environment
```
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
JWT_SECRET=...
```

## 4) Enable Auth Tokens
- Issue a JWT on `/auth/register` and `/auth/login`.
- Validate the token on all `/ai/*` endpoints.

## 5) Configure EAS
Set the backend base URL as an EAS secret:
```
eas secret:create --name BACKEND_BASE_URL --value https://your-api.example.com
```
This is read at build time by `app.config.js`.

## 6) Build + Test
- Build a dev client with the `development` profile.
- Sign up in the app and confirm `/auth/register` returns a token.
- Use AI features and confirm the backend receives calls.
