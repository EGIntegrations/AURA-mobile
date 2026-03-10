---
title: Permissions and Privacy
sidebar_label: Permissions and Privacy
---

# Permissions and Privacy

## iOS Purpose Strings (Configured in `app.json`)

- `NSCameraUsageDescription`: facial mimicry and vision training
- `NSPhotoLibraryUsageDescription`: optional image access for user-selected features
- `NSPhotoLibraryAddUsageDescription`: optional save path for generated images
- `NSMicrophoneUsageDescription`: speech practice and voice command features
- `NSSpeechRecognitionUsageDescription`: speech recognition workflows
- `NSFaceIDUsageDescription`: biometric sign-in

## Android Permissions

- `CAMERA`
- `RECORD_AUDIO`
- `USE_BIOMETRIC`
- `USE_FINGERPRINT`

## AI Processing Consent

AI-intensive features are explicitly consent-gated through `ConsentService` and settings UI.

Consent affects at least:

- conversation coaching
- mimicry camera analysis
- vision training analysis

## Privacy Handling Notes

- Production posture is backend-managed provider keys.
- Direct provider key mode is intended for local/dev workflows.
- Validate privacy policy and permission prompts on physical devices before release.
