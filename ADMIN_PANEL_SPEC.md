# AURA Admin Panel — Specification Document

> **Status:** Requirements-complete, not yet implemented  
> **Scope:** This document describes the *separate* web-based admin panel for AURA. It does NOT live in this mobile repo. It is a standalone web application.

---

## 1. Architecture Decision

The admin panel **must be a separate repository** from the mobile app.

| Attribute | Value |
|-----------|-------|
| **Repository** | `aura-admin` (new repo, not this one) |
| **Platform** | Web application (desktop-first, responsive tablet) |
| **Framework** | React 18+ |
| **Bundler** | Vite |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui |
| **State Management** | Zustand or React Query |
| **Auth** | Better Auth (email/password + optional OAuth) |
| **Deployment** | Vercel |
| **API Target** | Shared AURA backend API (same backend the mobile app uses) |

**Why separate?**
- The mobile app is **learner-only** — no admin screens, no role selection, no teacher flows.
- Admin workflows (authoring tasks, managing rosters, analytics) require large screens, complex forms, and data tables — poor UX on mobile.
- Separate deploy cycles: mobile goes through App Store review; admin panel deploys instantly via Vercel.
- Security boundary: admin auth, roles, and sessions are managed independently.

---

## 2. Core Features (Phase 1 — MVP)

### 2.1 Authentication & Role Management

- **Login page** — email/password only. No sign-up (admins are pre-provisioned or invited).
- **Role-based access control** — single role for MVP: `ADMIN`.
  - Future roles: `TEACHER` (class-scoped), `PARENT` (read-only for their child).
- **Session management** — JWT access token + refresh token. Secure httpOnly cookies.
- **Password reset** — email-based reset flow.

### 2.2 Dashboard (Home)

The landing page after login. A high-level overview:

- **Stats cards** (top row):
  - Total learners
  - Active learners (played a task in the last 7 days)
  - Tasks completed (last 7 days)
  - Words learned (last 7 days)
- **Recent activity feed** — list of recent task completions per learner (timestamp, learner name, task, score).
- **Quick actions** — buttons to:
  - Create new task
  - Invite learner
  - View progress reports

### 2.3 Learner Management (Class Roster)

A full CRUD interface for managing learners.

**Learner list view:**
- Data table with columns: Name, Age, Special Interests, Assigned Tasks, Last Active, Status (active / inactive).
- Search by name.
- Filter by age range, special interest, status.
- Sort by any column.
- Bulk actions: activate/deactivate, assign tasks, delete.

**Create / Edit learner:**
- Form fields:
  - Name (required)
  - Age (required, number)
  - Special Interests (multi-select tags: Animals, Food, Colors, Numbers, Emotions, Vehicles, etc.)
  - Notes (free text, for therapist/parent context)
  - Status: Active / Inactive
- Save creates the learner record in the backend.
- On create, optionally auto-assign a starter set of tasks based on age range.

**Learner detail view:**
- Profile card (name, age, interests, notes).
- Tabs:
  - **Progress** — charts: tasks completed over time, words learned, streak history.
  - **Assigned Tasks** — list of tasks assigned to this learner with completion status.
  - **Sessions** — full history of task sessions (score, duration, correct moves, date).
  - **Vocabulary** — words this learner has marked as learned, with category breakdown.

### 2.4 Task Library & Authoring

A full content management system for interactive tasks.

**Task list view:**
- Data table with columns: Title, Category, Type, Difficulty, Age Range, Assigned Count, Status (active / draft / archived).
- Search by title.
- Filter by category, type, difficulty, age range, status.
- Sort by any column.

**Create / Edit task:**
- Form sections:
  - **Basic Info:** Title, Description, Icon (emoji picker), Category (dropdown or tag), Difficulty (easy / medium / hard), Age Range (min/max sliders).
  - **Task Type:** Select from `drag-drop`, `tap-sequence`, `match`.
  - **Assets:** Upload or link images/audio files. Each asset has: ID, type (`image`/`audio`), URL, optional label.
    - Asset manager: drag-and-drop upload, preview thumbnails, delete.
  - **Rules:** Define success criteria for the task.
    - For each rule: action type (`drag-to-target`, `tap-in-order`, `match-pairs`), source asset, target asset, sequence order, success criteria (min score, max time), framing text (instruction shown to learner).
  - **Status:** Draft / Active / Archived.
- **Preview button** — opens a simplified preview of how the task will look in the mobile app (static mock, not full game engine).

**Task assignment:**
- From the task list or detail view, assign to one or more learners.
- Assignment modal: multi-select learner list, optional due date, optional notes.
- Bulk assign: select multiple tasks → assign to multiple learners.

### 2.5 Vocabulary Library & Curation

A content management system for the tailored vocabulary feature.

**Word list view:**
- Data table with columns: Word, Phonetic, Emoji, Category, Age Range, Learned Count, Status.
- Search by word.
- Filter by category, age range, status.

**Create / Edit word:**
- Form fields:
  - Word (required)
  - Phonetic pronunciation (required, IPA or simple phonetic)
  - Emoji (emoji picker)
  - Category (dropdown: Animals, Food, Colors, Numbers, Emotions, Vehicles, etc.)
  - Age Range (min/max)
  - Audio file upload (optional — TTS fallback in mobile app)
  - Status: Active / Draft / Archived

**Import / Bulk upload:**
- CSV import for bulk vocabulary additions.
- Template download.
- Validation: duplicate words, missing required fields.

### 2.6 Progress & Analytics

Comprehensive reporting across learners and tasks.

**Overview dashboard:**
- Date range picker (last 7 days, 30 days, 90 days, custom).
- Line chart: tasks completed per day across all learners.
- Bar chart: words learned per category.
- Heatmap: learner activity by day of week.

**Per-learner reports:**
- Select a learner → detailed report.
- Metrics:
  - Total tasks completed, average score, average duration.
  - Words learned count, category breakdown.
  - Current streak, best streak.
  - Task difficulty progression over time.
- Export to PDF or CSV.

**Per-task reports:**
- Select a task → see all sessions for that task.
- Aggregate metrics: completion rate, average score, average duration, common errors.
- Identify tasks that are too hard (low completion rate) or too easy (100% completion).

### 2.7 Settings

- **Organization settings** — org name, logo upload, timezone.
- **Admin users** — list of admin accounts, invite new admin, deactivate accounts.
- **Integrations** — API keys for backend (read-only display), webhook URLs.
- **Data export** — full data export (GDPR compliance).

---

## 3. Data Model & API Contract

The admin panel reads from and writes to the **same backend API** as the mobile app. Here are the key entities it must support:

### 3.1 Learner (User)
```typescript
interface Learner {
  id: string;
  name: string;
  email?: string; // optional, for parent contact
  age: number;
  specialInterests: string[];
  notes?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  type: 'drag-drop' | 'tap-sequence' | 'match';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  ageRange: [number, number];
  assets: TaskAsset[];
  rules: TaskRule[];
  isAssigned: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```
(See `src/types/Task.ts` in the mobile repo for full definitions of `TaskAsset` and `TaskRule`.)

### 3.3 TaskAssignment
```typescript
interface TaskAssignment {
  id: string;
  taskId: string;
  learnerId: string;
  assignedBy: string; // admin user id
  assignedAt: Date;
  dueDate?: Date;
  notes?: string;
  completedAt?: Date;
}
```

### 3.4 TaskSession
```typescript
interface TaskSession {
  id: string;
  taskId: string;
  learnerId: string;
  score: number;
  maxPossibleScore: number;
  moves: number;
  correctMoves: number;
  durationSeconds: number;
  completedAt: Date;
  syncedAt?: Date;
}
```

### 3.5 VocabularyWord
```typescript
interface VocabularyWord {
  id: string;
  word: string;
  phonetic: string;
  emoji: string;
  category: string;
  ageRange: [number, number];
  audioUrl?: string;
  isLearned: boolean; // per-learner, but stored on word record or junction table
}
```

### 3.6 AdminUser
```typescript
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'parent';
  status: 'active' | 'inactive';
  createdAt: Date;
}
```

### 3.7 Required API Endpoints (Backend Must Provide)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Admin login, returns JWT |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/learners` | List all learners (paginated, filterable) |
| `POST` | `/learners` | Create a new learner |
| `GET` | `/learners/:id` | Get learner details |
| `PUT` | `/learners/:id` | Update learner |
| `DELETE` | `/learners/:id` | Delete learner |
| `GET` | `/learners/:id/progress` | Get learner progress summary |
| `GET` | `/learners/:id/sessions` | Get learner task sessions |
| `GET` | `/tasks` | List all tasks (paginated, filterable) |
| `POST` | `/tasks` | Create a new task |
| `GET` | `/tasks/:id` | Get task details |
| `PUT` | `/tasks/:id` | Update task |
| `DELETE` | `/tasks/:id` | Delete/archive task |
| `POST` | `/tasks/:id/assign` | Assign task to learner(s) |
| `GET` | `/vocabulary` | List all vocabulary words |
| `POST` | `/vocabulary` | Create a new word |
| `PUT` | `/vocabulary/:id` | Update word |
| `DELETE` | `/vocabulary/:id` | Delete word |
| `POST` | `/vocabulary/import` | Bulk CSV import |
| `GET` | `/analytics/overview` | High-level stats |
| `GET` | `/analytics/learner/:id` | Per-learner analytics |
| `GET` | `/analytics/task/:id` | Per-task analytics |
| `GET` | `/admin/users` | List admin users |
| `POST` | `/admin/users/invite` | Invite new admin |

---

## 4. UI/UX Requirements

### 4.1 Design System
- Use **shadcn/ui** components as the base.
- Custom theme tokens aligned with AURA brand:
  - Primary: `#5B7CFF`
  - Secondary: `#A37BFF`
  - Success: `#2DD4BF`
  - Danger: `#F87171`
  - Background: white/light gray (`#F8FAFC`)
  - Card background: white with subtle border.
- Data tables should use shadcn's `Table` with pagination, sorting, and filtering.
- Forms should use shadcn's `Form`, `Input`, `Select`, `Switch`, `Textarea`.
- Modals and dialogs for confirmations and detail views.
- Toast notifications for success/error feedback (e.g., "Learner created", "Task saved").

### 4.2 Navigation Structure

```
/                    → Dashboard (overview)
/learners            → Learner list
/learners/:id        → Learner detail
/tasks               → Task library
/tasks/:id           → Task detail / edit
/tasks/new           → Create task
/vocabulary          → Vocabulary library
/vocabulary/:id      → Word detail / edit
/analytics           → Progress & analytics
/settings            → Organization & admin settings
```

### 4.3 Responsive Behavior
- **Desktop** (primary): full sidebar navigation, wide tables, side-by-side layouts.
- **Tablet**: collapsible sidebar, stacked layouts for forms.
- **Mobile** (minimum viable): hamburger menu, single-column layouts. Admin workflows are not optimized for phone screens, but should be usable on iPad/tablet.

---

## 5. Auth & Security Requirements

1. **No public registration** — only invited or pre-provisioned accounts.
2. **Password policy** — min 8 chars, 1 uppercase, 1 number.
3. **Session timeout** — 24h inactive logout.
4. **CSRF protection** — handled by Better Auth / cookie-based JWT.
5. **Rate limiting** — login attempts limited to 5 per minute per IP.
6. **Audit logging** — log all create/update/delete actions with admin ID and timestamp.
7. **Data privacy** — learner data is sensitive (children with autism). All API calls over HTTPS. No PII in logs.

---

## 6. Integration with Mobile App

The admin panel and mobile app share the same backend but are decoupled:

| Direction | Data Flow |
|-----------|-----------|
| Admin → Mobile | Admin creates/assigns tasks → mobile app fetches via `fetchAssignedTasks()` |
| Admin → Mobile | Admin curates vocabulary → mobile app filters by age + specialInterests |
| Mobile → Admin | Learner completes task → session syncs to backend → admin panel shows in analytics |
| Mobile → Admin | Learner marks word as learned → backend updates → admin panel reflects |

**Key integration points:**
- The `assignedTasks` array in the mobile `taskStore` is populated by the backend based on `TaskAssignment` records created in the admin panel.
- The `specialInterests` and `age` fields in `UserSettings` (set during learner creation in admin) drive the tailored vocabulary filtering in the mobile app.
- Task assets (images/audio) uploaded in the admin panel must be stored in a CDN (S3, Cloudflare R2, etc.) and referenced by URL in the mobile app.

---

## 7. Deployment

- **Target:** Vercel (or Netlify/Cloudflare Pages).
- **Environment variables:**
  - `VITE_API_BASE_URL` — backend API URL
  - `VITE_AUTH_SECRET` — Better Auth secret
- **CI/CD:** GitHub Actions → Vercel deploy on push to `main`.
- **Staging environment:** `staging.admin.aura.app` for testing before prod.

---

## 8. Out of Scope (Phase 1)

These are identified for future phases, NOT part of the MVP:

- Real-time collaboration (multiple admins editing simultaneously).
- Advanced gamification builder (custom reward systems beyond built-in badges).
- Parent portal (separate read-only view for parents).
- Mobile-responsive admin workflows (tablet is minimum, phone is not targeted).
- AI-generated tasks or vocabulary suggestions.
- Video assets for tasks.
- Multi-tenancy / multiple organizations.
- SSO (Google, Microsoft) — email/password only for MVP.

---

## 9. File References in This Repo

The following files in the mobile repo define the data contracts the admin panel must honor:

- `src/types/Task.ts` — Task, TaskAsset, TaskRule, TaskSession
- `src/types/Vocabulary.ts` — VocabularyWord
- `src/types/User.ts` — UserSettings (age, specialInterests)
- `src/store/taskStore.ts` — How the mobile app consumes tasks and sessions

---

## 10. Implementation Order (Recommended)

1. **Scaffold** the new `aura-admin` repo with Vite + React + Tailwind + shadcn/ui.
2. **Auth** — Better Auth setup, login page, protected routes.
3. **Dashboard** — stats cards + recent activity (read-only, uses mock data initially).
4. **Learner list** — data table with search/filter.
5. **Learner create/edit** — form + API integration.
6. **Task library** — list + create/edit form.
7. **Task assignment** — assign to learners.
8. **Vocabulary library** — list + create/edit + CSV import.
9. **Progress / Analytics** — charts and reports.
10. **Settings** — org settings, admin user management.

---

*Document generated 2026-05-04. This is a living spec — update as requirements evolve.*
