---
title: Overview
sidebar_label: Overview
---

# AURA Platform Overview

AURA (Autism Understanding and Recognition Assistant) is a React Native + Expo mobile application focused on guided emotion recognition, speech practice, facial mimicry, and AI-assisted conversation coaching.

## Current Production Codebase

- Active app stack: React Native 0.76.9 + Expo 52
- Source of truth: `src/` and Expo app config files
- Archived reference code: `legacy/swift-ios/` and `AI/`
- CI validation: GitHub Actions in `.github/workflows/ci.yml`

## What This Documentation Covers

- Application architecture and runtime modes
- Screen flows and service-layer responsibilities
- Backend endpoint contract expected by the mobile app
- Security, privacy, and data storage behavior
- Deployment and operations runbooks for EAS and Vercel
- Generated code reference inventory (active + archived)

## Quick Navigation

- [Architecture](./architecture)
- [Mobile App](./mobile-app)
- [Services and Integrations](./services-integrations)
- [Backend API Contract](./backend-api-contract)
- [Deployment (EAS + Vercel)](./deployment)
- [Code Reference](./code-reference)

## Runtime Modes at a Glance

1. Backend proxy mode: app calls your backend (`BACKEND_BASE_URL` configured), backend holds provider credentials.
2. Direct-key mode: app calls OpenAI and ElevenLabs directly using locally stored API keys.
3. Fallback mode: when AI calls fail or keys are unavailable, app uses built-in fallback responses and system TTS paths where supported.
