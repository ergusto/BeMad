---
title: "BeMad — Todo App PRD"
status: final
created: 2026-07-02
updated: 2026-07-02
---

# BeMad — Todo App PRD

## 1. Overview

BeMad is a deliberately minimal, single-user full-stack todo app. It supports exactly the core task loop — create, view, edit, complete, and delete tasks — fast, reliably, and with zero onboarding. Its differentiator is **personality**: all user-facing copy is written in the voice of Mr. Torgue (*Borderlands*) and rotates among ~5 interchangeable variants per string, so the app is delightful and rarely repeats itself.

This PRD defines *what* BeMad must do. Technical choices (TypeScript strict, Next.js App Router, Next.js API routes, Vitest + Playwright; persistence undecided) live in `project-context.md` and are settled/expanded in the architecture stage.

## 2. Goals & Success Metrics

**Goals**
- Deliver a complete, usable todo app despite intentionally minimal scope.
- Make task management feel instant and reliable.
- Differentiate through a distinctive, non-repetitive voice — without ever sacrificing clarity.

**Success Metrics**
- **Zero-guidance usability:** a first-time user completes create → edit → complete → delete with no instructions or onboarding.
- **Persistence stability:** no task is lost across page refreshes or returning in a new session (0 data-loss in testing).
- **Perceived-instant:** because the UI is optimistic (FR-10), every action reflects visually in **≤100 ms**; server reconciliation completes in **≤500 ms (p95)** under normal conditions.
- **Delight lands:** the voice reads as authentically Torgue and repeat use surfaces fresh variants (qualitative for a demo).

**Counter-metrics (must not regress)**
- Voice/rotation never reduces task-completion success — users always understand what a control does.
- No accessibility regressions from ALL-CAPS styling or rotating labels.

## 3. Users

**Primary (and only) user:** an individual managing their own personal tasks who wants a fast, frictionless todo tool and enjoys a product with humor. No accounts, roles, or shared access in v1.

### User Journey

**UJ-1 — Sam clears the morning list.** Sam opens BeMad; the list is already on screen (no login, no splash). Sam types "email the landlord," hits the add control (labeled `ADD IT!!!` today), and it appears instantly. Sam fixes a typo inline, then checks it off — it visibly styles as done and a toast cheers. Sam deletes a stale task; a confirmation asks before it's obliterated. Sam closes the tab; next morning the remaining tasks are still there. Sam never read an instruction and smiled at least once.

## 4. Functional Requirements

### Feature A — Task Management (core)
- **FR-1** Users can create a task from a short text description.
- **FR-2** Users see their full list of tasks immediately on opening the app.
- **FR-3** Users can edit a task's text in place.
- **FR-4** Users can toggle a task between complete and incomplete (bi-directional).
- **FR-5** Users can delete a task; deletion requires a confirmation step.
- **FR-6** Completed tasks are visually distinct from active tasks at a glance.
- **FR-7** Each task carries basic metadata: creation timestamp.
- **FR-8** Users can order the list using standard sort options — newest-first (default), oldest-first, alphabetical, and active-before-completed.
- **FR-9** Task text is validated on **both client and server**: leading/trailing whitespace is trimmed; empty or whitespace-only input is rejected; text is capped at **1000 characters (Unicode code points)**. Violations surface a voiced message and do not persist.

### Feature B — Instant, Polished Experience
- **FR-10** All mutations (add/edit/toggle/delete) update the UI optimistically, reconcile with the server, and roll back with a voiced, retryable error message on failure. Rollback behavior per operation: a failed **edit** restores the prior text while preserving the user's typed value for retry; a failed **delete** reinserts the task at its original position; a failed **toggle** snaps the status back; a failed **create** keeps the entered text so it can be resubmitted.
- **FR-11** A task that has not yet been server-confirmed cannot be edited, toggled, or deleted until its create resolves (its controls are disabled/pending), preventing operations against a task with no server identity.
- **FR-12** The app provides distinct empty, loading, and error states, all using voice-pack copy. On open, the list shows a loading state until tasks arrive, then the list or the empty state.
- **FR-13** The interface is responsive and usable on both desktop and mobile.

### Feature C — Personality & Voice (differentiator)
- **FR-14** All user-facing copy is sourced from a single centralized voice pack, written in Mr. Torgue's voice, so repeat use stays fresh and the app never feels static. No user-facing string is hardcoded in components. **Voice-scope boundary:** the voice applies to user-facing copy only — code identifiers, API field names, error codes, logs, and documentation stay plain and professional.
- **FR-15** Each copy key defines ~5 semantically-identical variants (see the Voice & Copy Guide in the brief addendum for starter strings).
- **FR-16** Copy rotates: (a) on page load each surface picks a variant; (b) action controls (Add, Edit, Save, Delete, confirm/cancel, Retry, and the sort control's flavor text) re-roll their label after each activation; (c) transient surfaces (toasts, and empty/loading/error messages) pick a fresh variant each time they appear; (d) the completion checkbox and the text input do not have rotating labels. The same variant is never shown twice in a row for a given key, and over time every variant is reachable.
- **FR-17** Rotation never alters text that communicates current state or selection (e.g. which sort option is active, or a control's on/off meaning) — only flavor text rotates; the state a control conveys stays unambiguous.
- **FR-18** Profanity in copy is always bleeped (e.g. `F***`), never uncensored.
- **FR-19** Every variant unambiguously conveys the action it labels — humor never obscures function (clarity rule).
- **FR-20** ALL-CAPS presentation is applied via styling, not stored strings; interactive controls, toasts, and the confirm/cancel dialog expose stable, descriptive accessible names and roles even as the visible text rotates (accessibility rule).

### Feature D — Persistence & API
- **FR-21** Tasks persist durably server-side and remain consistent across refreshes and sessions (not client-storage-only).
- **FR-22** A small, well-defined API supports CRUD operations over tasks with consistent response shapes and appropriate status codes.

**Core entity — Todo:** `id`, `text` (non-empty, ≤1000 code points), `completed` (boolean), `createdAt`.

## 5. Non-Functional Requirements

- **NFR-1 Performance:** optimistic UI reflects every action in ≤100 ms; server reconciliation ≤500 ms (p95) under normal conditions (see perceived-instant metric).
- **NFR-2 Reliability:** no silent data loss; graceful client- and server-side error handling that never breaks the core flow.
- **NFR-3 Simplicity & Maintainability:** minimal footprint, no premature abstraction; easy for a future developer to understand, deploy, and extend.
- **NFR-4 Accessibility:** keyboard-usable, screen-reader-safe; the rotating/ALL-CAPS copy must not degrade assistive-tech experience.
- **NFR-5 Compatibility:** current evergreen browsers, desktop and mobile viewports.
- **NFR-6 Forward-compatibility (constraint):** v1 is single-user with no auth, but the design must not preclude adding authentication/multi-user later (e.g. leave room for an owner concept). Auth is explicitly not built in v1.

## 6. Scope

**In (v1):** FR-1 through FR-22 above.

**Out (v1), by design:** user accounts / authentication, multi-user & collaboration, task prioritization, deadlines/due dates, reminders/notifications, tags/categories/sub-tasks, search/filtering, and multiple selectable voices (architecture leaves the door open; not built).

## 7. Glossary

- **Task / Todo:** used interchangeably — one item in the list (`id`, `text`, `completed`, `createdAt`).
- **Voice pack:** the single centralized module holding all user-facing copy.
- **Copy key:** a named slot in the voice pack (e.g. the add-button label) mapping to its set of variants.
- **Variant:** one of the ~5 semantically-identical strings for a copy key.
- **Surface:** any place copy appears — a control label, toast, empty/loading/error message, or dialog.

## 8. Open Questions

- **Persistence mechanism:** deferred to the architecture stage (must satisfy FR-21; must be genuinely durable in the chosen Next.js runtime, not serverless-ephemeral).
