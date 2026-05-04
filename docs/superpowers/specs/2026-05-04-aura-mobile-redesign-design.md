# AURA Mobile App Redesign — Design Specification

**Date:** 2026-05-04
**Topic:** AURA Mobile Redesign — Liquid Glass UI, Task Library, Tailored Vocabulary, Separate Admin Panel
**Status:** Approved for implementation

---

## 1. Overview

### 1.1 Purpose

AURA is pivoting from an emotion-recognition / AI-driven autism support app to a focused educational task-and-vocabulary platform for children with autism. The redesign strips away emotion-specific features and replaces them with:

1. **Tailored vocabulary** filtered by target age, interest area, and special interest.
2. **An interactive task library** (e.g., "tap on the duck and move it to where it belongs") with game-like scoring and progress tracking.
3. **Admin separation** — a standalone web app for parents and teachers to manage tasks, clipart, rules, framing, and student progress.

### 1.2 Target Users

- **Primary learners:** Children with autism, ages 3–12.
- **Admins:** Parents and teachers (managed entirely in a separate web app).

### 1.3 Design Principles

- **Kid-first:** Large touch targets, friendly rounded typography, high-contrast liquid glass surfaces.
- **Offline-first:** Tasks and vocabulary cache locally; sessions queue when offline.
- **No admin in mobile:** The mobile app is purely a learner experience. All management happens in the web panel.
- **Native Liquid Glass where possible:** Use iOS 26+ native liquid glass with graceful blur-based fallback on Android and older iOS.

---

## 2. Architecture & Project Structure

### 2.1 Directory Restructure

```
src/
  screens/                    ← learner-facing screens only
    AuthenticationScreen.tsx
    DashboardScreen.tsx
    TaskLibraryScreen.tsx       NEW
    TaskPlayerScreen.tsx        NEW
    VocabularyScreen.tsx        NEW
    ProgressScreen.tsx
    SettingsScreen.tsx
  components/                 ← Liquid Glass design system
    AuraBackground.tsx
    LiquidGlassCard.tsx         replaces GlassCard
    LiquidGlassButton.tsx       replaces GlassButton
    LiquidGlassHeader.tsx       upgraded
    LiquidGlassSheet.tsx        NEW — bottom sheet / modal
    ProgressRing.tsx            NEW
    TaskCard.tsx                NEW
    VocabCard.tsx               NEW
  navigation/
    RootNavigator.tsx           stripped to 7 screens max
  store/
    authStore.ts                keeps auth + user progress
    taskStore.ts                NEW — task session state
  services/                   ← pruned to essentials
    AuthenticationService.ts
    BackendAuthService.ts
    BackendClient.ts
    BiometricService.ts
    ConsentService.ts
    Logger.ts
  theme/
    colors.ts                   updated for liquid glass palette
    typography.ts               switched to rounded, kid-friendly fonts
  types/
    User.ts                     simplified — remove emotion-specific types from active exports
    Task.ts                     NEW
    Vocabulary.ts               NEW
  legacy/                     ← old screens & services (preserved, not imported)
    screens/
      GameScreen.tsx
      SpeechPracticeScreen.tsx
      MimicryScreen.tsx
      ConversationScreen.tsx
      VisionTrainingScreen.tsx
      VoiceCommandScreen.tsx
      AdminDashboardScreen.tsx
      APIKeyConfigScreen.tsx
    services/
      OpenAIService.ts
      ElevenLabsService.ts
      ImageGenerationService.ts
      ConversationService.ts
      ImageDatasetService.ts
      CurriculumEngine.ts
      ProgressionService.ts
      APIKeyService.ts
      UserMonitoringService.ts
      AudioService.ts
```

### 2.2 Legacy Code Policy

Old screens and services are **moved to `legacy/` but NOT deleted**. They are removed from all imports in `RootNavigator.tsx`, `App.tsx`, and active stores. No dead code is executed. This preserves history while keeping the active bundle lean.

### 2.3 Navigation Stack

```
Auth → Dashboard → [TaskLibrary, Vocabulary, Progress, Settings]
TaskLibrary → TaskPlayer → (completion modal) → TaskLibrary
```

Removed from navigation: `Game`, `SpeechPractice`, `Mimicry`, `Conversation`, `VisionTraining`, `VoiceCommand`, `AdminDashboard`, `APIKeyConfig`.

---

## 3. Liquid Glass Design System

### 3.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#5B7CFF` | Buttons, active states, progress fill |
| Secondary | `#A37BFF` | Tags, secondary accents, category chips |
| Success | `#2DD4BF` | Completed states, checkmarks, streaks |
| Danger | `#F87171` | Errors, destructive actions |
| Glass Base | `rgba(255,255,255,0.08)` | Card surface |
| Glass Border | `rgba(255,255,255,0.20)` | Card border (light) or `rgba(91,124,255,0.30)` |
| Glass Highlight | `linear-gradient(180deg, rgba(255,255,255,0.15), transparent)` | Specular reflection on top edge |
| Background | `#0b0f1a` | Deep dark base layer |

### 3.2 Typography

- **Before:** Pixel monospace (`Menlo` / `monospace`) — retro but harsh for kids.
- **After:**
  - iOS: `SF Rounded` (system rounded font, soft and friendly).
  - Android: `Inter` or system sans-serif with rounded styling.
- Scale:
  - App title: 40px, bold, letter-spacing 0.5
  - Heading: 20px, bold
  - Title (card): 17px, semibold
  - Body: 15px, regular
  - Caption: 12px, regular

### 3.3 LiquidGlassCard

**iOS 26+ (native liquid glass):**
- `expo-blur` with `intensity={60}`, `tint="light"`
- Top-edge gradient overlay simulating specular refraction
- Border: 1px `rgba(255,255,255,0.20)`
- Shadow: `0 8px 32px rgba(0,0,0,0.10)`
- Corner radius: 24px

**Fallback (Android / older iOS):**
- `expo-blur` with `intensity={25}`, `tint="dark"`
- Semi-transparent background `rgba(20,24,45,0.40)`
- Same border and shadow, softer blur

### 3.4 LiquidGlassButton

- **Primary:** Gradient fill (`Primary → Accent`), glow shadow, full-round pill (border-radius ≥ 24px).
- **Secondary:** Glass surface with border, no fill.
- **Danger:** Red gradient (`Danger → DangerDark`).
- Height: 52px minimum for kid-friendly tap targets.

### 3.5 New Components

- **TaskCard:** Emoji icon, title, description, difficulty badge, category tags.
- **VocabCard:** Large emoji, word, phonetic, category, audio and confirm action buttons.
- **ProgressRing:** Circular SVG progress indicator for task completion percentage.
- **LiquidGlassSheet:** Bottom-sheet modal for task selection, settings, or confirmation — uses Liquid Glass styling.

---

## 4. Screens

### 4.1 DashboardScreen

**Purpose:** Kid's home. Welcoming, low-pressure, quick access to everything.

**Layout:**
- Full-screen `AuraBackground` with subtle animated gradients.
- Top: Friendly greeting ("Hi Alex!"), current streak flame icon.
- Middle: 2×2 grid of large, tappable cards:
  - 📚 Task Library
  - 🔤 Vocabulary
  - 📈 My Progress
  - ⚙️ Settings
- Bottom: Today's quick stat ("3 tasks done!").

**Data:** `currentUser` from `authStore`.

### 4.2 TaskLibraryScreen

**Purpose:** Browse and pick tasks.

**Layout:**
- `LiquidGlassHeader` with back button.
- Search bar (glass input) at top.
- Horizontal scroll of filter chips: "All", "Assigned", "Animals", "Space", "Food", "Easy", "Medium", "Hard".
- Vertical scroll of `TaskCard`s.
- Empty state: Friendly illustration + "No tasks yet. Ask your teacher to assign some!"

**Data:** `tasks[]` from `taskStore`, filtered by assigned/category/difficulty.

**Actions:** Tap task → `TaskPlayerScreen`.

### 4.3 TaskPlayerScreen

**Purpose:** Interactive task execution with scoring.

**Layout:**
- Full-screen, no header (immersive).
- Top bar: Task title, score, timer.
- Main area: Interactive task surface (drag-and-drop, tap-sequence, or match).
- Bottom: Hint button, quit button.
- Completion overlay: Celebratory confetti animation, final score, "Play Again" / "Back to Library" buttons.

**Data:** `activeTask` and `sessionState` from `taskStore`.

**Interactions:**
- Uses `react-native-gesture-handler` for drag-and-drop and tap sequences.
- Real-time score updates.
- Session state auto-saved to AsyncStorage every 5 seconds for crash recovery.

**End state:**
- POST `TaskSession` to backend (or queue if offline).
- Update local progress in `authStore`.
- Show celebratory modal.

### 4.4 VocabularyScreen

**Purpose:** Tailored vocabulary learning.

**Layout:**
- `LiquidGlassHeader`.
- Horizontal category filter chips.
- Content: Swipeable full-screen cards (Tinder-style) or vertical grid of `VocabCard`s.
- Each card: Large emoji, word in bold, phonetic, category tag.
- Tap audio button → play pronunciation (TTS via system voice — no AI dependency).
- Tap checkmark → mark as learned, card animates away.

**Data:** `vocabularyWords[]` from backend, filtered by:
- `currentUser.settings.age` (or derived from profile).
- `currentUser.settings.specialInterests` (e.g., `["space", "dinosaurs"]`).

**Tailoring logic (client-side):**
```
Filtered = AllWords
  .where(word.ageRange includes user.age)
  .where(word.category in user.specialInterests OR word.category is 'general')
  .orderBy(isLearned ASC, category ASC)
```

### 4.5 ProgressScreen

**Purpose:** Kid-friendly view of their own achievements.

**Layout:**
- `LiquidGlassHeader`.
- Hero: Circular `ProgressRing` showing overall completion.
- Stats row: Tasks completed, words learned, current streak, total score.
- Weekly bar chart: Simple 7-day bar chart (tasks per day).
- Recent achievements: Unlock badges (e.g., "First 10 tasks!", "5-day streak!").

**Data:** `currentUser.progress` from `authStore`.

**Removed from old ProgressScreen:** Emotion mastery grid, mimicry history, speech practice history, conversation history.

### 4.6 SettingsScreen

**Purpose:** Minimal learner settings.

**Layout:**
- `LiquidGlassHeader`.
- Sound toggle (on/off background music and SFX).
- Theme toggle (light/dark — default dark).
- Sign Out button.

**Data:** `currentUser.settings` from `authStore`.

**Removed from old SettingsScreen:**
- Biometric login toggle (moved to auth flow only).
- AI data processing consent (no AI features in learner app).
- Voice Commands link.
- API Keys link.
- Admin Dashboard link.

### 4.7 AuthenticationScreen

**Purpose:** Sign in / sign up. Mostly unchanged except role simplification.

**Changes:**
- Role selection removed from sign-up. All new mobile sign-ups are `STUDENT`.
- Cleaned-up UI with Liquid Glass styling.

---

## 5. Data Model

### 5.1 Task

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  icon: string;              // emoji
  type: 'drag-drop' | 'tap-sequence' | 'match';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;          // "animals", "space", "food", etc.
  ageRange: [number, number]; // [3, 5]
  assets: TaskAsset[];       // clipart, audio cues
  rules: TaskRule[];         // e.g., "move duck to pond"
  isAssigned: boolean;       // set by admin
  isActive: boolean;         // admin can deactivate
  createdAt: Date;
  updatedAt: Date;
}

interface TaskAsset {
  id: string;
  type: 'image' | 'audio';
  url: string;
  label?: string; // e.g., "duck", "pond"
}

interface TaskRule {
  id: string;
  action: 'drag-to-target' | 'tap-in-order' | 'match-pairs';
  sourceAssetId?: string;
  targetAssetId?: string;
  sequence?: string[];       // ordered asset IDs for tap-sequence
  successCriteria: {
    minScore?: number;
    maxTimeSeconds?: number;
  };
  framingText: string;       // instruction spoken/shown to child
}
```

### 5.2 VocabularyWord

```typescript
interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  emoji: string;
  category: string;
  ageRange: [number, number];
  audioUrl?: string;         // pronunciation audio
  isLearned: boolean;        // local state per user
}
```

### 5.3 TaskSession

```typescript
interface TaskSession {
  id: string;
  taskId: string;
  userId: string;
  score: number;
  maxPossibleScore: number;
  moves: number;
  correctMoves: number;
  durationSeconds: number;
  completedAt: Date;
  syncedAt?: Date;           // null until pushed to backend
}
```

### 5.4 User Settings (Updated)

```typescript
interface UserSettings {
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark';
  age: number;                    // for content filtering
  specialInterests: string[];     // e.g., ["space", "dinosaurs"]
}
```

---

## 6. State Management

### 6.1 authStore (Zustand)

Mostly unchanged. Still handles:
- `currentUser`, `isAuthenticated`
- `signIn`, `signUp`, `signOut`
- `updateUserProgress`

Settings updated to include `age` and `specialInterests`.

### 6.2 taskStore (Zustand) — NEW

```typescript
interface TaskStore {
  tasks: Task[];
  assignedTasks: Task[];
  activeTask: Task | null;
  sessionState: {
    score: number;
    moves: number;
    correctMoves: number;
    startTime: number;
  };
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTasks: () => Promise<void>;
  fetchAssignedTasks: () => Promise<void>;
  setActiveTask: (task: Task | null) => void;
  recordMove: (isCorrect: boolean, points: number) => void;
  completeSession: () => Promise<void>;
  syncPendingSessions: () => Promise<void>;
}
```

**Offline queue:** `TaskSession`s are saved to AsyncStorage under `@aura_pending_sessions`. `syncPendingSessions` drains the queue on app launch and when connectivity returns. `completeSession` always writes locally first, then attempts backend sync.

---

## 7. Error Handling

### 7.1 Offline-First Caching

- Tasks and vocabulary are cached on device after first fetch (`AsyncStorage` key: `@aura_tasks_cache`, `@aura_vocab_cache`).
- `maxAge` of 24 hours. After expiry, app attempts refresh; if offline, continues with stale cache.
- Task completion sessions queue locally. Sync attempted on app launch, network change, and explicit pull-to-refresh.

### 7.2 Graceful Media Degradation

- Missing clipart (`onError` on `<Image>`): render fallback emoji from `task.icon`.
- Missing audio: disable audio button, show muted icon tooltip.
- Corrupt task data: skip task in library, log warning, show "Some tasks couldn't load" banner.

### 7.3 Network Error UI

- Failed `BackendClient` calls show inline retry button (not modals for transient failures).
- 3 consecutive failures → show `LiquidGlassSheet` with friendly message: "Having trouble connecting. Check your WiFi and try again."
- Auth 401/403 → clear local auth state, redirect to `AuthenticationScreen`.

### 7.4 Task Player Recovery

- Auto-save session state every 5 seconds to `@aura_active_session`.
- On app launch, if `@aura_active_session` exists and is incomplete, show modal: "You were in the middle of 'Move the Duck'. Continue?"
- If user declines, discard the partial session.

---

## 8. Testing

### 8.1 Component Snapshots (React Native Testing Library)

Every design system component gets a snapshot test:
- `LiquidGlassCard` — default, with children, custom padding
- `LiquidGlassButton` — primary, secondary, disabled states
- `TaskCard` — full props, missing image fallback
- `VocabCard` — default, audio loaded, audio missing

Run via `npm test` (jest with RNTL).

### 8.2 Store Unit Tests

`taskStore` actions tested with mocked `AsyncStorage` and `BackendClient`:
- `fetchTasks` — success, network failure (falls back to cache), empty response
- `completeSession` — writes to queue, syncs immediately when online, queues when offline
- `syncPendingSessions` — drains queue, handles partial backend failures (retry later)

### 8.3 E2E Tests (Detox)

One happy-path test per task type:
1. Launch app → sign in → open Task Library.
2. Filter by category.
3. Select a task.
4. Complete the task (drag-drop / tap-sequence / match).
5. Verify score increase on Progress screen.

Run on iOS Simulator in CI.

### 8.4 Manual QA Checklist (Pre-Release)

- [ ] Liquid Glass renders correctly on iOS 26+ physical device (visible blur + refraction).
- [ ] Fallback looks acceptable on Android device (no jarring visual difference).
- [ ] Offline mode: tasks still playable, sessions queue and sync on reconnect.
- [ ] Large task library (100+ tasks) scrolls at 60fps.
- [ ] VoiceOver (iOS) / TalkBack (Android) reads all interactive elements in logical order.
- [ ] Task player crash recovery works (force-close mid-task, relaunch, continue prompt appears).

---

## 9. Admin Panel (Separate Web App)

### 9.1 Rationale

Admin functionality is for adults (parents, teachers), not kids. A separate web app allows:
- Desktop-optimized UI (tables, drag-drop uploads, CSV imports).
- Faster iteration without app store review cycles.
- Own deployment pipeline on Vercel.
- Mobile app stays lean — zero admin code shipped to learners.

### 9.2 Tech Stack

- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Auth:** Same backend JWT as mobile app.
- **Data:** Same backend REST API (`/tasks`, `/vocabulary`, `/students`, `/progress`).
- **Hosting:** Vercel (separate repo: `AURA-admin` in `Developer/`).

### 9.3 Core Features

#### 9.3.1 Student Management
- View list of students. Filter by supervisor (teacher sees their class; parent sees their own children).
- Individual student progress dashboards: tasks completed, words learned, accuracy trends, weekly activity chart.
- Add/remove students. Generate temporary passwords.

#### 9.3.2 Task Library Admin
- Browse full task library. Filter by type, category, difficulty.
- Toggle **"Assign to student"** per task per student.
- Create/edit task metadata: title, description, difficulty, category, age range.
- Mark tasks as active/inactive.
- Upload/manage clipart assets (PNG/SVG) for tasks.

#### 9.3.3 Vocabulary Admin
- CRUD for vocabulary words.
- Bulk import via CSV or JSON.
- Upload pronunciation audio files.
- Mark words as "featured" for specific students.

#### 9.3.4 Asset Management (Clipart)
- Upload, replace, delete clipart images.
- Organize into folders by category.
- Preview how clipart renders in the simulated task player.

#### 9.3.5 Rules & Framing Admin
- Configure task rules: drag-to-target, tap-in-order, match-pairs.
- Set success criteria: minimum score, time limit.
- Write framing text (instructions read/shown to child before task starts).
- Preview rule in a simulated task player (mini React component replicating mobile player logic).

### 9.4 API Contracts (Shared with Mobile)

```
GET    /api/v1/tasks?assignedTo={userId}&category={cat}&difficulty={diff}
POST   /api/v1/tasks/{id}/assign          body: { studentId }
DELETE /api/v1/tasks/{id}/assign          body: { studentId }
GET    /api/v1/vocabulary?age={age}&interests={interests}
POST   /api/v1/sessions                   body: TaskSession
GET    /api/v1/students                   (teacher/parent only)
GET    /api/v1/students/{id}/progress
```

---

## 10. Migration Plan Summary

### 10.1 Mobile App

1. **Move legacy code** to `legacy/screens/` and `legacy/services/`.
2. **Strip `RootNavigator`** to 7 active screens.
3. **Remove old screen imports** from `App.tsx` and anywhere else.
4. **Update `UserSettings`** type to include `age` and `specialInterests`.
5. **Build design system** — `LiquidGlassCard`, `LiquidGlassButton`, `LiquidGlassHeader`, `LiquidGlassSheet`, `TaskCard`, `VocabCard`, `ProgressRing`.
6. **Build new screens** — `TaskLibraryScreen`, `TaskPlayerScreen`, `VocabularyScreen`.
7. **Refactor existing screens** — `DashboardScreen`, `ProgressScreen`, `SettingsScreen` with new design system.
8. **Create `taskStore`** for task session state and offline queue.
9. **Update theme** — `colors.ts`, `typography.ts` for liquid glass palette and rounded fonts.
10. **Test** — component snapshots, store unit tests, Detox E2E.

### 10.2 Admin Panel (Separate Repo)

1. Scaffold new Vite + React + Tailwind + shadcn project.
2. Set up auth against existing backend.
3. Build student management page.
4. Build task library admin page.
5. Build vocabulary admin page.
6. Build asset upload page.
7. Build rules & framing page.
8. Deploy to Vercel.

---

## 11. Out of Scope

The following are explicitly **not** part of this redesign:

- Mobile app admin dashboard (removed entirely).
- API key configuration screen (removed — backend-managed only).
- Voice commands (removed).
- Emotion recognition game, speech practice, facial mimicry, AI conversation, vision training (all moved to legacy, not shown in product).
- AI/ML features (no OpenAI, ElevenLabs, or image generation in learner app).
- In-app task creation or vocabulary editing (admin-only in web panel).
- Real-time collaboration or multiplayer.

---

## 12. Approval Log

| Section | Status | Date |
|---------|--------|------|
| Architecture & Project Structure | Approved | 2026-05-04 |
| Liquid Glass Design System | Approved | 2026-05-04 |
| Data Flow & Screens | Approved | 2026-05-04 |
| Error Handling & Testing | Approved | 2026-05-04 |
| Admin Panel (Separate Web App) | Approved | 2026-05-04 |
