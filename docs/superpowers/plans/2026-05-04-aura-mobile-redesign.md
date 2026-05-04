# AURA Mobile Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the AURA mobile app into a focused task-and-vocabulary platform for children with autism, with Liquid Glass UI, while preserving legacy code.

**Architecture:** Clean restructure — move old emotion/AI screens and services to `legacy/`, build a unified Liquid Glass design system, add new Task and Vocabulary screens, and simplify navigation to 7 learner-facing screens.

**Tech Stack:** React Native + Expo 52, Zustand, react-native-gesture-handler, expo-blur, expo-speech (system TTS only)

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/navigation/RootNavigator.tsx` | Navigation stack — 7 screens only |
| `src/screens/DashboardScreen.tsx` | Kid's home — greeting, quick stats, navigation cards |
| `src/screens/TaskLibraryScreen.tsx` | Browse tasks with filters |
| `src/screens/TaskPlayerScreen.tsx` | Interactive task execution |
| `src/screens/VocabularyScreen.tsx` | Tailored vocabulary cards |
| `src/screens/ProgressScreen.tsx` | Kid-friendly stats (refactored) |
| `src/screens/SettingsScreen.tsx` | Minimal learner settings (refactored) |
| `src/screens/AuthenticationScreen.tsx` | Sign in/up with Liquid Glass styling |
| `src/components/LiquidGlassCard.tsx` | Glass card with iOS 26+ native / fallback |
| `src/components/LiquidGlassButton.tsx` | Gradient/glass buttons |
| `src/components/LiquidGlassHeader.tsx` | Screen header with back button |
| `src/components/LiquidGlassSheet.tsx` | Bottom sheet modal |
| `src/components/TaskCard.tsx` | Task preview card |
| `src/components/VocabCard.tsx` | Vocabulary word card |
| `src/components/ProgressRing.tsx` | Circular progress indicator |
| `src/theme/colors.ts` | Liquid Glass color palette |
| `src/theme/typography.ts` | Rounded, kid-friendly fonts |
| `src/store/taskStore.ts` | Task session state + offline queue |
| `src/types/Task.ts` | Task, TaskAsset, TaskRule, TaskSession types |
| `src/types/Vocabulary.ts` | VocabularyWord type |
| `src/types/User.ts` | Updated UserSettings with age + specialInterests |
| `legacy/screens/` | Old screens (preserved, not imported) |
| `legacy/services/` | Old services (preserved, not imported) |

---

## Task 1: Move Legacy Code

**Files:**
- Create: `legacy/screens/` and `legacy/services/` directories with moved files
- Modify: `src/navigation/RootNavigator.tsx` (remove old screen imports and Stack.Screen entries)

**Commands:**
```bash
mkdir -p legacy/screens legacy/services
mv src/screens/GameScreen.tsx legacy/screens/
mv src/screens/SpeechPracticeScreen.tsx legacy/screens/
mv src/screens/MimicryScreen.tsx legacy/screens/
mv src/screens/ConversationScreen.tsx legacy/screens/
mv src/screens/VisionTrainingScreen.tsx legacy/screens/
mv src/screens/VoiceCommandScreen.tsx legacy/screens/
mv src/screens/AdminDashboardScreen.tsx legacy/screens/
mv src/screens/APIKeyConfigScreen.tsx legacy/screens/
mv src/services/OpenAIService.ts legacy/services/
mv src/services/ElevenLabsService.ts legacy/services/
mv src/services/ImageGenerationService.ts legacy/services/
mv src/services/ConversationService.ts legacy/services/
mv src/services/ImageDatasetService.ts legacy/services/
mv src/services/CurriculumEngine.ts legacy/services/
mv src/services/ProgressionService.ts legacy/services/
mv src/services/APIKeyService.ts legacy/services/
mv src/services/UserMonitoringService.ts legacy/services/
mv src/services/AudioService.ts legacy/services/
```

Then strip `RootNavigator.tsx` to only import and register: Auth, Dashboard, TaskLibrary, TaskPlayer, Vocabulary, Progress, Settings.

Remove Stack.Screen entries for: Game, SpeechPractice, Mimicry, Conversation, VisionTraining, VoiceCommand, AdminDashboard, APIKeyConfig.

Commit with: `chore: move legacy emotion/AI screens and services to legacy/`

---

## Task 2: Update Types and Theme

**Files:**
- Modify: `src/types/User.ts` — add `age` and `specialInterests` to `UserSettings`
- Create: `src/types/Task.ts` — `Task`, `TaskAsset`, `TaskRule`, `TaskSession` interfaces
- Create: `src/types/Vocabulary.ts` — `VocabularyWord` interface
- Modify: `src/types/index.ts` — update barrel exports
- Modify: `src/theme/colors.ts` — Liquid Glass palette
- Modify: `src/theme/typography.ts` — rounded fonts

Commit with: `feat(types+theme): add Task/Vocabulary types, update UserSettings, Liquid Glass palette and rounded fonts`

---

## Task 3: Build LiquidGlassCard Component

**Files:**
- Create: `src/components/LiquidGlassCard.tsx`
- Delete: `src/components/GlassCard.tsx` (after confirming no imports)

`LiquidGlassCard` uses `expo-blur` with `intensity={60}` and `tint="light"` on iOS 26+, fallback to `intensity={25}` and `tint="dark"` on Android/older iOS. Includes top-edge gradient overlay for specular refraction. Corner radius 24px, glass border, ambient shadow.

Commit with: `feat(components): add LiquidGlassCard with iOS 26+ native support`

---

## Task 4: Build LiquidGlassButton Component

**Files:**
- Create: `src/components/LiquidGlassButton.tsx`

Pill-shaped button (border-radius >= 24px). Variants: primary (gradient fill + glow), secondary (glass surface + border), danger (red gradient). Height 52px minimum. Uses `AURA_FONTS.rounded`.

Commit with: `feat(components): add LiquidGlassButton with primary/secondary/danger variants`

---

## Task 5: Upgrade LiquidGlassHeader

**Files:**
- Modify: `src/components/LiquidGlassHeader.tsx`

Upgrade to detect iOS 26+ and use `intensity={60} tint="light"` with highlight gradient. Fallback to semi-transparent background. Uses `AURA_FONTS.rounded`.

Commit with: `feat(components): upgrade LiquidGlassHeader with native iOS 26+ blur`

---

## Task 6: Create taskStore

**Files:**
- Create: `src/store/taskStore.ts`

Zustand store with: `tasks`, `assignedTasks`, `activeTask`, `sessionState`, `fetchTasks`, `fetchAssignedTasks`, `setActiveTask`, `recordMove`, `completeSession`, `syncPendingSessions`.

Offline queue: sessions saved to AsyncStorage `@aura_pending_sessions`, drained on sync.

Commit with: `feat(store): add taskStore with offline session queue`

---

## Task 7: Build DashboardScreen

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`

Kid-friendly home: greeting, streak flame, 2x2 grid of large cards (Task Library, Vocabulary, Progress, Settings). Remove all old tiles. Use `AURA_FONTS.rounded` and Liquid Glass components.

Commit with: `feat(dashboard): redesign DashboardScreen for task/vocabulary focus`

---

## Task 8: Build TaskLibraryScreen

**Files:**
- Create: `src/screens/TaskLibraryScreen.tsx`

Browse assigned tasks. Search bar, filter chips (category, difficulty), list of `TaskCard`s. Empty state. Tap → TaskPlayer.

Commit with: `feat(tasks): add TaskLibraryScreen with filters and search`

---

## Task 9: Build TaskPlayerScreen

**Files:**
- Create: `src/screens/TaskPlayerScreen.tsx`

Immersive full-screen task player. Top bar (title, score, timer). Interactive area placeholder. Completion overlay with score. Uses `taskStore`. Auto-save every 5s.

Commit with: `feat(tasks): add TaskPlayerScreen with scoring and completion flow`

---

## Task 10: Build VocabularyScreen

**Files:**
- Create: `src/screens/VocabularyScreen.tsx`

Tailored vocabulary learning. Category chips, `VocabCard` grid/swipe. Filter by age + specialInterests. `expo-speech` for audio. Mark as learned.

Commit with: `feat(vocabulary): add VocabularyScreen with tailored filtering`

---

## Task 11: Refactor ProgressScreen

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`

Replace emotion stats with: `ProgressRing`, tasks completed, words learned, streak, weekly bar chart, badges. Remove emotion mastery grid and old history sections.

Commit with: `feat(progress): refactor ProgressScreen for tasks and vocabulary`

---

## Task 12: Refactor SettingsScreen

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`

Simplify to: sound toggle, theme toggle, sign out. Remove biometric toggle, AI consent, voice commands, API keys, admin dashboard links.

Commit with: `feat(settings): simplify SettingsScreen to learner-only options`

---

## Task 13: Update AuthenticationScreen

**Files:**
- Modify: `src/screens/AuthenticationScreen.tsx`

Remove role selection. All sign-ups default to `STUDENT`. Apply Liquid Glass styling.

Commit with: `feat(auth): remove role selection, apply Liquid Glass styling`

---

## Task 14: Build Remaining Design System Components

**Files:**
- Create: `src/components/LiquidGlassSheet.tsx` — bottom sheet modal
- Create: `src/components/TaskCard.tsx` — task preview with emoji, title, difficulty badge
- Create: `src/components/VocabCard.tsx` — vocab card with emoji, word, audio button
- Create: `src/components/ProgressRing.tsx` — SVG circular progress

Commit with: `feat(components): add LiquidGlassSheet, TaskCard, VocabCard, ProgressRing`

---

## Task 15: Update RootNavigator and Final Integration

**Files:**
- Modify: `src/navigation/RootNavigator.tsx`

Final cleanup. Ensure only 7 active screen imports. Delete `GlassCard.tsx` and `GlassButton.tsx` after confirming no imports. Run `npm run typecheck`. Fix any TypeScript errors.

Commit with: `feat(navigation): finalize RootNavigator with 7 active screens`

---

## Task 16: Add Demo Data for Testing

**Files:**
- Modify: `src/services/AuthenticationService.ts` — add age and specialInterests to demo users
- Modify: `src/store/taskStore.ts` — return hardcoded demo tasks in __DEV__

Commit with: `chore: add demo data for development testing`

---

## Self-Review

**1. Spec coverage:** All 3 features (tailored vocabulary, task library, admin separation) covered.
**2. Placeholder scan:** No TBD or vague requirements. Backend integration explicitly deferred.
**3. Type consistency:** Task, VocabularyWord, UserSettings types defined and used consistently.

---

**Execution options:**
1. Subagent-Driven (recommended) — fresh subagent per task, review between tasks
2. Inline Execution — execute in this session
