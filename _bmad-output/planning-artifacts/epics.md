---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments:
  - 'prds/prd-BeMad-2026-07-02/prd.md'
  - 'prds/prd-BeMad-2026-07-02/addendum.md'
  - 'architecture/architecture-BeMad-2026-07-02/ARCHITECTURE-SPINE.md'
  - 'architecture/architecture-BeMad-2026-07-02/ARCHITECTURE.md'
  - 'project-context.md'
---

# BeMad - Epic Breakdown

## Overview

This document decomposes the BeMad PRD and Architecture spine into implementable epics and stories. No separate UX contract exists; UX intent is carried by the PRD's FRs and the spine's voice/accessibility decisions (AD-8…AD-11).

## Requirements Inventory

### Functional Requirements

FR-1: Create a task from a short text description.
FR-2: See the full list of tasks immediately on opening the app.
FR-3: Edit a task's text in place.
FR-4: Toggle a task between complete and incomplete (bi-directional).
FR-5: Delete a task, requiring a confirmation step.
FR-6: Completed tasks are visually distinct from active tasks at a glance.
FR-7: Each task carries a creation timestamp.
FR-8: Order the list via standard sort options — newest-first (default), oldest-first, alphabetical, active-before-completed.
FR-9: Validate task text on client and server — trim, reject empty/whitespace-only, cap at 1000 code points, voiced message on violation.
FR-10: Mutations update the UI optimistically, reconcile with the server, and roll back per-operation with a voiced, retryable error on failure.
FR-11: A task without a server id cannot be edited/toggled/deleted until its create resolves.
FR-12: Distinct empty, loading, and error states, all using voice-pack copy (loading shown on open until tasks arrive).
FR-13: Responsive and usable on desktop and mobile.
FR-14: All user-facing copy sourced from a single centralized voice pack (Mr. Torgue voice); no hardcoded strings; voice confined to user-facing copy (voice-scope boundary).
FR-15: Each copy key defines ~5 semantically-identical variants.
FR-16: Copy rotates — variant per surface on page load; action controls re-roll on each activation; transient surfaces fresh each appearance; checkbox/text-input excluded; no back-to-back repeat; all variants reachable.
FR-17: Rotation never alters text that conveys current state or selection.
FR-18: Profanity in copy is always bleeped (e.g. `F***`).
FR-19: Every variant unambiguously conveys its action (clarity beats comedy).
FR-20: ALL-CAPS via styling, not stored strings; controls/toasts/dialog expose stable, descriptive accessible names as visible text rotates.
FR-21: Tasks persist durably server-side, consistent across refreshes and sessions (not client-storage-only).
FR-22: A small, well-defined API supports CRUD over tasks with consistent response shapes and status codes.

### NonFunctional Requirements

NFR-1: Performance — optimistic UI reflects every action in ≤100 ms; server reconciliation ≤500 ms (p95) under normal conditions.
NFR-2: Reliability — no silent data loss; graceful client- and server-side error handling that never breaks the core flow.
NFR-3: Simplicity & Maintainability — minimal footprint, no premature abstraction; easy to understand, deploy, and extend.
NFR-4: Accessibility — WCAG 2.2 AA, zero critical violations; keyboard-usable, screen-reader-safe despite rotating/ALL-CAPS copy.
NFR-5: Compatibility — current evergreen browsers; desktop and mobile viewports.
NFR-6: Forward-compatibility — single-user, no auth in v1, but the design must not preclude adding auth/multi-user later (room for an `owner`).

### Additional Requirements

_From the Architecture spine (AD-n) and project-context — technical constraints that shape stories:_

- **Scaffold (Epic 1 / Story 1):** greenfield — no prebuilt starter beyond `create-next-app`. First story sets up the Next.js 16 (App Router, TS strict) project structure (`app/`, `lib/{todos,db,voice,store}`, `tests/`), Node 24, and test infra (Vitest + Playwright + @axe-core/playwright) with `package.json` scripts.
- **AD-1 Layered dependency direction:** UI → API → service → repository → Postgres, never backward; UI never imports DB/repository.
- **AD-2 Single `TodoRepository`:** all persistence behind one interface in `lib/db`; no DB client elsewhere; expose `repo.healthcheck()`.
- **AD-3 Postgres 18** is the durable, server-side system of record.
- **AD-4 REST contract:** Route Handlers under `app/api/todos` + `/[id]`; `GET/POST/PATCH/DELETE`; PATCH partial (`{text?, completed?}`, ≥1 field); error envelope `{ error: { code, message } }`, `code` a shared enum.
- **AD-5 Shared Todo type + Zod schema** single source of truth; repository is the sole snake_case↔camelCase mapper.
- **AD-6 Server-authoritative validation** against the shared schema.
- **AD-7 Optimistic + rollback** state paradigm; client `tempId`, server `id` authoritative, reconcile on create.
- **AD-8 Voice pack module;** client maps API `error.code` → voiced copy.
- **AD-9 Deterministic rotation selector** (injected RNG); one client voice provider owns per-key rotation state; select post-hydration.
- **AD-10 A11y contract:** CSS `text-transform`, stable aria names/roles.
- **AD-11 XSS-safe rendering:** no `dangerouslySetInnerHTML` for task text.
- **AD-12 Docker Compose:** multi-stage Dockerfile (non-root, HEALTHCHECK) + `app` + `db` services, named volume, dev/test profiles, `GET /api/health`.
- **AD-13 Test floor:** Vitest unit/integration (repo vs real test Postgres, handlers, rotation selector, validation), Playwright E2E ≥5, axe a11y, ≥70% meaningful coverage.
- **AD-14 Single client-side owner** of the todo collection (data + loading/error/optimistic + sort order).
- **Stack:** TypeScript (strict), Next.js 16, Node 24 LTS, PostgreSQL 18, Drizzle ORM (behind repo, pin exact), **Zod 4 (shared validation schema, client+server per AD-5/AD-6) + drizzle-zod**, Vitest 4, Playwright + @axe-core/playwright, Docker Compose.

### UX Design Requirements

_No standalone UX design contract (bmad-ux was not run). UX-critical behavior is captured in FR-6, FR-8, FR-10–FR-13 (states, sort, optimistic feel) and FR-14–FR-20 + AD-8/9/10 (voice, rotation, accessibility)._

### FR Coverage Map

FR-1: Epic 1 — create task
FR-2: Epic 1 — view list on open
FR-3: Epic 1 — edit text in place
FR-4: Epic 1 — toggle complete/incomplete
FR-5: Epic 1 — delete with confirmation
FR-6: Epic 1 — completed visually distinct
FR-7: Epic 1 — creation timestamp
FR-8: Epic 2 — sort options
FR-9: Epic 1 — validation (client + server, Zod)
FR-10: Epic 2 — optimistic update + rollback
FR-11: Epic 2 — no mutations on unconfirmed task
FR-12: Epic 2 — empty/loading/error states
FR-13: Epic 2 — responsive desktop/mobile
FR-14: Epic 3 — centralized voice pack + scope boundary
FR-15: Epic 3 — ~5 variants per key
FR-16: Epic 3 — rotation rules
FR-17: Epic 3 — rotation never alters state-bearing text
FR-18: Epic 3 — profanity bleeped
FR-19: Epic 3 — clarity
FR-20: Epic 3 — caps via CSS + stable aria
FR-21: Epic 1 — durable server-side persistence
FR-22: Epic 1 — CRUD API

_NFRs: NFR-1 implemented in E2 (optimistic), verified in E4 (perf); NFR-2 E1/E2; NFR-3 all epics; NFR-4 built in E3, audited in E4; NFR-5 E2/E4; NFR-6 E1 (schema leaves room for `owner`)._

## Epic List

### Epic 1: Core Task Management
A user can create, view, edit, complete, and delete tasks that persist durably across refreshes and sessions — a working todo app that runs via `docker compose up`. This epic stands up the containerized environment (Next.js app + Postgres), the repository + shared Zod schema, the CRUD API, and a minimal UI (plain copy). QA integrated per story (repository/handler/validation unit + integration tests, first E2E).
**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-9, FR-21, FR-22

### Epic 2: Instant & Polished Experience
Task actions feel instantaneous via optimistic updates with per-operation rollback; the list presents distinct empty, loading, and error states, supports user-selectable sort order, and works cleanly on desktop and mobile. Builds on Epic 1. QA: component tests, E2E for states and rollback.
**FRs covered:** FR-8, FR-10, FR-11, FR-12, FR-13

### Epic 3: The Torgue Voice & Accessibility
Every user-facing surface speaks in Mr. Torgue's voice via a centralized voice pack with ~5 rotating variants per string — bleeped, always clear, and fully accessible (ALL-CAPS via CSS, stable aria names as labels rotate, no rotation of state-bearing text), targeting WCAG 2.2 AA. The product's differentiator. Builds on Epics 1–2. QA: deterministic rotation-selector unit tests, axe-core a11y E2E.
**FRs covered:** FR-14, FR-15, FR-16, FR-17, FR-18, FR-19, FR-20

### Epic 4: Verified & Shippable
The application is proven and documented: ≥70% meaningful coverage, the full ≥5-test Playwright E2E suite green, an accessibility audit (WCAG 2.2 AA, zero critical), a security review (XSS on rendered task text), a performance check against the NFR-1 budgets, and the delivery docs — README with setup instructions, the AI-integration log, and the framework comparison. Consolidates the QA activities and documentation deliverables.
**FRs covered:** (cross-cutting — verifies NFR-1..6 and AD-13; produces QA reports + docs)

---

## Epic 1: Core Task Management

A working, containerized, persistent todo app: create, view, edit, complete, and delete tasks (plain copy). Establishes the scaffold, the containerized environment, the data layer, and the CRUD API. Governed by AD-1–AD-6, AD-11, AD-12.

### Story 1.1: Project scaffold & containerized environment

As a developer,
I want a scaffolded Next.js project that runs with its database via Docker Compose,
So that every later story builds and runs in a consistent, reproducible environment from day one.

**Acceptance Criteria:**

**Given** a clean checkout
**When** I follow the README and run `docker compose up`
**Then** the Next.js 16 (App Router, TypeScript strict) app starts alongside a PostgreSQL 18 container, and `GET /api/health` returns 200 only when the DB is reachable
**And** the source tree matches the spine seed (`app/`, `lib/{todos,db,voice,store}`, `tests/{unit,integration,e2e}`)
**And** `package.json` scripts exist for `dev`, `build`, `test` (Vitest), and `test:e2e` (Playwright), with Node 24 pinned
**And** a multi-stage Dockerfile runs the app as a non-root user and defines a `HEALTHCHECK`; compose defines a named volume and `dev`/`test` profiles

**Tests:** integration — `/api/health` returns 503 when DB is down, 200 when up; CI/local smoke — `docker compose up` boots both services and the healthcheck passes.

### Story 1.2: Todo data model, shared Zod schema & repository

As a developer,
I want a `todos` table, one shared Zod schema, and a single repository,
So that all persistence is durable, type-safe, and reached through one swappable interface (AD-2/AD-3/AD-5).

**Acceptance Criteria:**

**Given** the running database
**When** migrations are applied
**Then** a `todos` table exists with `id` (UUID, server-generated), `text`, `completed` (default false), `created_at` (timestamptz)
**And** a single `TodoRepository` in `lib/db` exposes `create`, `list`, `get`, `update`, `delete`, and `healthcheck`, and is the only module importing the DB client
**And** one Zod schema + inferred `Todo` type in `lib/todos` is the sole source of the shape, and the repository is the only place mapping `snake_case`↔`camelCase`

**Tests:** integration — repository CRUD against a real test Postgres (create returns a server UUID; get/list/update/delete behave; round-trip mapping correct); unit — schema accepts/rejects representative payloads.

### Story 1.3: Create and view tasks (with validation)

As a user,
I want to add a task and immediately see my full list,
So that I can capture and review what I need to do with no setup.

**Acceptance Criteria:**

**Given** the app is open
**When** the page loads
**Then** `GET /api/todos` returns the persisted tasks and they render in the list (or an empty list if none)
**When** I submit a new task's text
**Then** `POST /api/todos` validates server-side via the shared Zod schema (trim, reject empty/whitespace-only, cap 1000 code points), persists it, and it appears in the list with its creation time
**And** invalid input returns `{ error: { code, message } }` with a 4xx and is surfaced to the user; the client mirrors the same validation for instant feedback (FR-9)
**And** task text is rendered via React escaping only — never `dangerouslySetInnerHTML` (AD-11)

**Tests:** integration — POST rejects empty/whitespace/>1000; GET returns created rows. E2E — user adds a task and sees it; reload shows it persisted. Unit — client validation mirror.

### Story 1.4: Edit a task's text in place

As a user,
I want to edit a task's text inline,
So that I can fix or refine a task without recreating it.

**Acceptance Criteria:**

**Given** an existing (server-confirmed) task
**When** I edit its text and save
**Then** `PATCH /api/todos/[id]` with `{ text }` validates via the shared schema and persists the change, and the list shows the updated text
**And** an empty/invalid edit is rejected with the standard error envelope and the prior text is retained

**Tests:** integration — PATCH text validates and persists; rejects invalid. E2E — edit a task inline, reload, change persists.

### Story 1.5: Toggle completion with clear status

As a user,
I want to mark a task complete or active again,
So that I can track what's done at a glance.

**Acceptance Criteria:**

**Given** a task in the list
**When** I toggle its completion control
**Then** `PATCH /api/todos/[id]` with `{ completed }` persists the new status
**And** completed tasks are visually distinct from active ones (FR-6)
**And** completion is bi-directional (a completed task can be reactivated)

**Tests:** integration — PATCH toggles completed both ways. E2E — toggle on/off, reload persists; completed styling asserted.

### Story 1.6: Delete a task with confirmation

As a user,
I want to delete a task after confirming,
So that I can remove tasks without accidental loss.

**Acceptance Criteria:**

**Given** a task in the list
**When** I trigger delete
**Then** a confirmation step is shown before anything is removed
**When** I confirm
**Then** `DELETE /api/todos/[id]` removes it (204) and it disappears from the list; **when** I cancel, nothing changes

**Tests:** integration — DELETE removes the row. E2E — delete-with-confirm removes; cancel keeps; reload reflects deletion.

---

## Epic 2: Instant & Polished Experience

Make the working app feel instant and finished: one client-side store, optimistic updates with rollback, explicit states, sorting, and responsiveness. Governed by AD-7, AD-14.

### Story 2.1: Single client-side todo store with empty/loading/error states

As a user,
I want the app to clearly show when it's loading, empty, or in error,
So that I always understand the state of my list.

**Acceptance Criteria:**

**Given** the app is open
**When** todos are being fetched
**Then** a loading state is shown until they arrive, then either the list or a distinct empty state
**And** a fetch/mutation failure shows a distinct error state
**And** exactly one client module (the store) owns the todo collection and its loading/error state; no component fetches todos independently (AD-14)

**Tests:** unit — store reducer transitions (loading→loaded/empty/error). E2E — empty state on no todos; error state when API forced to fail.

### Story 2.2: Optimistic mutations with rollback

As a user,
I want my actions to appear instantly and recover gracefully if they fail,
So that the app always feels fast and never lies about what was saved.

**Acceptance Criteria:**

**Given** any mutation (create/edit/toggle/delete)
**When** I perform it
**Then** the UI updates optimistically within ≤100 ms, then reconciles with the server
**And** on failure it rolls back per operation (edit restores prior text but keeps my typed value; delete reinserts at original position; toggle snaps back; create keeps the entered text) and shows a retryable error (FR-10)
**And** a task with no server `id` cannot be edited/toggled/deleted until its create resolves (FR-11)

**Tests:** unit — reducer optimistic-apply + rollback per op; pending (no-id) task is non-mutable. E2E — forced API failure triggers correct rollback and retry.

### Story 2.3: User-selectable sort order

As a user,
I want to sort my list,
So that I can view tasks in the order that suits me.

**Acceptance Criteria:**

**Given** a list of tasks
**When** I choose a sort option
**Then** the store re-orders the list by newest-first (default), oldest-first, alphabetical, or active-before-completed
**And** the current sort selection is always clearly indicated (sort is client-owned; the API returns creation-order)

**Tests:** unit — sort comparators for each option. E2E — switching sort reorders the visible list.

### Story 2.4: Responsive layout

As a user,
I want the app to work well on phone and desktop,
So that I can manage tasks anywhere.

**Acceptance Criteria:**

**Given** the app on a mobile or desktop viewport
**When** I use it
**Then** the layout adapts without horizontal scrolling or overlap and all controls remain usable (FR-13, NFR-5)

**Tests:** E2E — Playwright runs core flow at mobile and desktop viewports; layout assertions.

---

## Epic 3: The Torgue Voice & Accessibility

Give the app its personality — rotating Torgue copy, bleeped and clear — without harming accessibility. Governed by AD-8, AD-9, AD-10.

### Story 3.1: Voice pack module & variant catalog

As a user,
I want the app's text to sound like Mr. Torgue,
So that using it is fun and memorable.

**Acceptance Criteria:**

**Given** the voice pack in `lib/voice`
**When** copy is needed
**Then** every user-facing string is defined as a key mapping to ~5 semantically-identical variants (seeded from the brief addendum's guide), profanity bleeped (`F***`), each variant unambiguously conveying its action (FR-14, FR-15, FR-18, FR-19)
**And** the voice is confined to user-facing copy — API field names, error codes, logs, and identifiers stay plain (voice-scope boundary)

**Tests:** unit — every declared copy key has ≥5 variants; no un-bleeped profanity token present; snapshot of the catalog.

### Story 3.2: Deterministic rotation selector & voice provider

As a user,
I want the copy to keep changing so it never feels stale,
So that the app stays fresh on repeat use.

**Acceptance Criteria:**

**Given** the rotation selector
**When** a variant is requested for a key
**Then** selection is a pure function `(key, lastShownIndex, rng)` with injected RNG — never repeating the same variant twice in a row and keeping all variants reachable
**And** one client-side voice provider owns per-key rotation state and selection happens after hydration (no SSR mismatch)
**And** rotation never alters text that conveys current state or selection (FR-17)

**Tests:** unit — selector never repeats back-to-back; covers all variants over N draws; deterministic with a seeded RNG. Integration — no hydration warning in render.

### Story 3.3: Wire all surfaces to the voice pack

As a user,
I want every button, message, and state to speak in the voice,
So that the personality is consistent everywhere.

**Acceptance Criteria:**

**Given** the UI from Epics 1–2
**When** any label, toast, empty/loading/error message, or confirm/cancel dialog renders
**Then** its text comes from the voice pack (no hardcoded user-facing strings remain), with action controls re-rolling on activation and transient surfaces picking fresh on each appearance (FR-16)
**And** API `error.code` values are mapped to voiced copy on the client, not by the server (AD-8)

**Tests:** unit/lint — no literal user-facing strings in components (guard). E2E — activating a control shows voiced copy; error path shows a voiced (not raw) message.

### Story 3.4: Accessibility of rotating copy (WCAG 2.2 AA)

As a user who relies on assistive technology,
I want the app fully usable despite the shouty, rotating copy,
So that the personality never costs me access.

**Acceptance Criteria:**

**Given** the voiced UI
**When** audited
**Then** ALL-CAPS comes from CSS `text-transform` (not stored caps), and controls, toasts, and the confirm/cancel dialog expose stable, descriptive accessible names/roles even as visible labels rotate (FR-20)
**And** the app is fully keyboard-operable and an axe-core audit reports zero critical violations at WCAG 2.2 AA (NFR-4)

**Tests:** E2E — `@axe-core/playwright` scan on main screen + dialog = zero critical; keyboard-only completes the core flow; aria-name stability asserted across a re-roll.

---

## Epic 4: Verified & Shippable

Prove and document the product: coverage, full E2E, accessibility, security, performance, and delivery docs. Verifies NFR-1..6 and AD-13; produces the QA and documentation deliverables.

### Story 4.1: Complete the E2E suite

As a stakeholder,
I want the core journeys covered by end-to-end tests,
So that regressions are caught automatically.

**Acceptance Criteria:**

**Given** the finished app
**When** the Playwright suite runs
**Then** at least 5 tests pass covering: create, edit, toggle-complete, delete-with-confirm, empty state, loading state, error/rollback, and **persistence across reload and a new session** (AD-13)

**Tests:** this story *is* the E2E suite; it runs green in CI/local and via the `test` compose profile.

### Story 4.2: Coverage & accessibility audit

As a stakeholder,
I want measured coverage and a clean accessibility audit,
So that quality is evidenced, not assumed.

**Acceptance Criteria:**

**Given** the test suites
**When** coverage is measured
**Then** meaningful coverage is ≥70% and reported
**And** an axe-core/Lighthouse accessibility audit shows zero critical WCAG 2.2 AA violations, documented as a QA report

**Tests:** coverage gate in the Vitest config; a11y audit output saved under `docs/qa/`.

### Story 4.3: Security & performance review

As a stakeholder,
I want the app checked for common vulnerabilities and against its performance budgets,
So that it is safe and fast enough.

**Acceptance Criteria:**

**Given** the app
**When** reviewed
**Then** task-text rendering is confirmed XSS-safe (no `dangerouslySetInnerHTML`; a script-injection payload renders inert) (AD-11)
**And** a performance check confirms optimistic UI ≤100 ms and server reconciliation ≤500 ms p95 under normal conditions (NFR-1), with findings and any remediations documented

**Tests:** E2E — inject `<script>`-style task text and assert it renders as inert text. Perf — measured interaction/reconcile timings recorded in a QA report.

### Story 4.4: Delivery documentation

As a stakeholder,
I want clear setup and process documentation,
So that anyone can run the app and understand how it was built.

**Acceptance Criteria:**

**Given** the completed project
**When** I read the docs
**Then** a README explains setup and `docker compose up`, environment variables, and test commands
**And** the AI-integration log, the framework comparison, and a "how BMAD guided implementation" summary are complete and linked

**Tests:** doc review — a fresh reader can start the app from the README alone (verified during the QA pass).
