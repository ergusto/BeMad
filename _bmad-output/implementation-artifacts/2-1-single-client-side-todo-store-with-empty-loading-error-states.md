---
baseline_commit: 21075b9a072b04efd8b6de193757bfedf96c01c9
---

# Story 2.1: Single client-side todo store with empty/loading/error states

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to clearly show when it's loading, empty, or in error,
so that I always understand the state of my list.

## Acceptance Criteria

1. **Given** the app is open, **when** todos are being fetched, **then** a loading state is shown until they arrive, then either the list or a distinct empty state.
2. **And** a fetch/mutation failure shows a distinct error state.
3. **And** exactly one client module (the store) owns the todo collection and its loading/error state; no component fetches todos independently (AD-14).

## Tasks / Subtasks

- [x] **Task 1 — Pure reducer for the collection state machine** (AC: #1, #2)
  - [x] Create `lib/store/todo-store.tsx` and export a **pure** `todoReducer(state, action)` plus the state/action types. State is a discriminated union on `status`: `{ status: "loading" }` | `{ status: "ready"; todos: Todo[] }` | `{ status: "error"; message: string }`. **Empty is derived** (`status === "ready" && todos.length === 0`), not a separate status.
  - [x] Actions (at minimum): `load/start` → loading; `load/success` (todos) → ready; `load/error` (message) → error; `set` (todos) → ready (used after a successful mutation to replace the collection). Keep the reducer pure and side-effect-free so it's unit-testable **without a DOM/React harness** (this directly serves the Epic 1 action item "make UI logic unit-testable").
  - [x] Leave room (comments/shape) for Story 2.2 (optimistic + rollback) and 2.3 (sort order) to extend this store — do NOT build them now.
- [x] **Task 2 — The single store owner: provider + hook** (AC: #3)
  - [x] In `lib/store/todo-store.tsx` (`"use client"`), implement `TodoStoreProvider` (React context) that owns the reducer, runs the **initial fetch** once on mount (`fetchTodos()` → `load/success`/`load/error`, guarded against unmount), and exposes via `useTodoStore()`: the current state (`status`, `todos`, `message`), a derived `isEmpty`, a `retry()` (re-fetch after an error), and mutation actions `create(input)`, `update(id, input)`, `remove(id)` that call the existing `lib/todos-client` wrappers, `await`, then dispatch `set` (or surface the error). **This is the ONE owner (AD-14)** — components consume it via `useTodoStore()`; no component calls `fetchTodos`/`createTodo`/etc. directly anymore.
  - [x] Mutations are **not optimistic** here (that's Story 2.2): await the server, then update state. On mutation failure, surface a plain error to the caller/component (keep the list) — see Task 3 for how the UI shows it.
  - [x] The store owns collection + loading/error state ONLY. Per-item UI state (edit draft, confirming-delete, in-flight flags) stays in the item component — that's view state, not collection state.
- [x] **Task 3 — Refactor `app/todo-app.tsx` to consume the store** (AC: #1, #2, #3)
  - [x] Wrap the client UI in `<TodoStoreProvider>` (e.g. `TodoApp` renders the provider around the list/form) so there is a single store instance.
  - [x] Replace the component's local `todos`/`loading`/`error` + `useEffect` fetch with `useTodoStore()`. Render **four distinct states**: **loading** ("Loading…"), **error** (a distinct error state with the message + a **Retry** button calling `retry()`), **empty** (`isEmpty` → "No tasks yet."), and the **list**.
  - [x] The add form calls `store.create(...)`; each `TodoItem` calls `store.update(...)` / `store.remove(...)` (toggle is `update({completed})`). Keep the SAME accessible names/roles/text as Epic 1 so existing E2E keep passing: input `aria-label="New task"`, "Add task", checkbox `aria-label={`Completed: ${text}`}`, "Edit"/"Save"/"Cancel", `aria-label={`Delete: ${text}`}`/`Confirm delete:`/`Cancel delete:`, "No tasks yet.", the `.todo-done` class + `data-completed`, single-editor via `editingId`, and the in-flight/disable guards from Stories 1.3–1.6.
  - [x] Mutation errors: keep surfacing them where they occur (per-item inline error for edit/toggle/delete; the add-form error for create). These satisfy AC #2's "mutation failure shows a distinct error state" without a full-screen takeover; the full error *state* is for the initial-load failure.
- [x] **Task 4 — Tests** (AC: #1, #2, #3)
  - [x] **NEW** `tests/unit/todo-store.test.ts` — unit-test the pure `todoReducer`: `loading → ready` with todos (loaded), `loading → ready` with `[]` (empty), `loading → error`, `error → loading` on retry, and `set` replaces the collection. No DB, no DOM.
  - [x] **NEW** `tests/e2e/states.spec.ts` — Playwright with **network interception** (deterministic, DB-independent): (a) **empty** — `page.route('**/api/todos', …)` fulfil `GET` with `200 []` → assert the empty state ("No tasks yet.") shows and no `li`; (b) **error** — fulfil `GET` with `500` `{error:{code:"INTERNAL",message}}` → assert the distinct error state shows (and, if implemented, that **Retry** re-fetches after the route is removed). Wait for loading to clear appropriately.
  - [x] Typecheck + lint clean; **full Vitest suite green** with `TEST_DATABASE_URL` set; **all existing E2E still pass** (create-view, edit-in-place, edit-cancel, toggle-complete, delete-with-confirm, validation) — the refactor must not change their behaviour. Keep `fileParallelism:false`.

## Review Findings

_Code review 2026-07-06 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 3 ACs + invariants (AD-1/2/8/11/14) **pass**, no Epic-1 regression. Blind + Edge converged on the load-race and the dropped editingId reset. Triage: 0 decision-needed, 4 patch, 1 deferred, 4 dismissed._

- [x] [Review][Patch] `load()`/`retry()` has no per-request guard — only `mountedRef` (never toggled between loads). Concurrent loads (retry re-entry, StrictMode dev double-mount) can let a stale response win (last-to-resolve, not last-requested). Fix: a request-generation token (a ref incremented per `load`; only dispatch success/error when the token still matches) [lib/store/todo-store.tsx]
- [x] [Review][Patch] Mutation dispatches (`append`/`upsert`/`remove`) aren't mounted-guarded — a mutation resolving after the provider unmounts dispatches on an unmounted store. Fix: guard those dispatches with `mountedRef` (fold into the token work) [lib/store/todo-store.tsx]
- [x] [Review][Patch] The refactor dropped Epic 1's "clear `editingId` when its row is deleted" — currently unreachable (delete isn't offered on the row being edited) but leaves latent dangling editor state. Fix: reconcile `editingId` against the list in `TodoView` (`useEffect` clearing it if the id no longer exists) [app/todo-app.tsx]
- [x] [Review][Patch] E2E error-recovery test asserts only the *absence* of the error after Retry, not that a valid ready state rendered. Fix: assert recovery (e.g. the Add-task button becomes enabled — enabled only when `status === "ready"`) [tests/e2e/states.spec.ts]
- [x] [Review][Defer] A mutation that succeeds server-side while the collection is not `ready` (e.g. a future reload path in Story 2.3) is no-op'd by the reducer and silently dropped from the UI (row exists in DB, not shown until next load). Currently unreachable in production; the reconcile-after-mutation belongs with Story 2.2's optimistic/reconcile layer [lib/store/todo-store.tsx]

_Dismissed (with evidence): context `value` not memoized — the provider re-renders ONLY on reducer state changes, which must propagate to consumers anyway, so memoization yields no real saving here (and would need `useCallback` churn); loading-state E2E "race-prone" — the client component SSRs its initial `loading` state, so "Loading…" is present on first paint (test passed deterministically); `update` returns `Todo` while `create`/`remove` return `void` — folded into a patch (make `update` return `void` for consistency; callers ignore it); `set` action replaced by granular `append`/`upsert`/`remove` (Auditor, informational) — intentional design improvement, intent preserved, better than a whole-collection replace._

**Resolution (2026-07-07):** all 4 patch findings applied and verified. (1) `load()` now takes a per-call generation token (`loadIdRef`); only the latest load dispatches — kills the stale-response race and StrictMode double-dispatch. (2) the `create`/`update`/`remove` dispatches are `mountedRef`-guarded. (3) resolved by **derivation instead of an effect**: `editing` is computed per rendered row (`editingId === todo.id`), so a removed row (not rendered) can never show as editing — a `useEffect`+`setState` sync was tried but ESLint's `react-hooks/set-state-in-effect` (correctly) rejects it, and derivation is the better pattern anyway. (4) the error-recovery E2E now asserts the app reaches `ready` (Add-task button enabled). Also made `update` return `void` for API consistency. Post-fix: typecheck + lint clean (0 warnings); **100/100 Vitest**; **10 E2E pass** on Chromium. The 1 deferred item is in `deferred-work.md`.

## Dev Notes

### What this story changes (the AD-14 consolidation)

Today `app/todo-app.tsx` owns the collection state inline (`todos`, `loading`, `error`, the mount `useEffect` fetch) and each action calls `lib/todos-client` directly. Epic 1's code review repeatedly flagged this ad-hoc ownership (load-vs-create race, etc.). **Story 2.1 moves collection ownership into one store** (`lib/store/todo-store.tsx`) — the AD-14 single owner — and makes the component a consumer. This is the seam Story 1.3 explicitly set up: `lib/todos-client.ts` was written as a thin fetch wrapper *for the store to consume*.

- **Current state (to refactor):** `todo-app.tsx` `TodoApp` holds `todos/loading/error/editingId` + the fetch effect + create; `TodoItem` holds edit/toggle/delete + per-item flags and calls the client wrappers directly.
- **After 2.1:** `TodoStoreProvider` (in `lib/store`) owns `todos` + `status` + `message` + the fetch + the mutation actions. `TodoApp`/`TodoItem` consume `useTodoStore()`. Per-item view state stays local.
- **Must be preserved:** every existing behaviour and every accessible name/role/text (the Epic 1 E2E suite is the regression guard — it must stay green), plus the in-flight guards, single-editor, and the completed styling.

### Scope fences (do NOT build here)

- **Optimistic updates + rollback** (FR-10) → **Story 2.2**. Here mutations await the server then update; the store is *structured* so 2.2 can add optimistic apply + rollback + `tempId` handling (FR-11), but that logic is 2.2's.
- **Sort order** (FR-8) → **Story 2.3** (the store will own sort; leave room, don't build).
- **Responsive layout** (FR-13) → Story 2.4. **Voice pack** → Epic 3 (plain copy now). **XSS/a11y/perf audits** → Epic 4.
- No API/route/schema/repository changes; no client-wrapper changes (consume `lib/todos-client` as-is).

### Architecture compliance (guardrails)

- **AD-14 (the point of this story):** exactly ONE client module owns the todo collection + its loading/error state (and later sort/optimistic). Implement as a **context provider** (single instance) + `useTodoStore()` consumer — NOT a bare hook that each component instantiates (that would create multiple owners). No component fetches todos independently.
- **UI states:** loading, empty, and error are explicit, distinct render states owned by the store (AD-14 conventions table). Each uses plain copy for now (voice-pack copy comes in Epic 3).
- **AD-1/AD-2:** the store (client) reaches data only via `lib/todos-client` → the API; it never imports `lib/db`. **AD-11:** text still via React escaping. **AD-8:** errors plain.
- **AD-7 (not yet):** optimistic/rollback is 2.2; this story is the non-optimistic baseline the optimistic layer will wrap.

### Files this story touches

- **NEW:** `lib/store/todo-store.tsx` (pure `todoReducer` + `TodoStoreProvider` + `useTodoStore`), `tests/unit/todo-store.test.ts`, `tests/e2e/states.spec.ts`
- **UPDATE:** `app/todo-app.tsx` (consume the store; render loading/error/empty/list; wire actions), possibly `lib/store/index.ts` (re-export from `todo-store.tsx` if convenient — replace the placeholder), and `app/globals.css` only if an error-state style is warranted (optional/minimal)
- **PRESERVE (no regression):** all API routes, repository, schema, `lib/todos-client.ts` (consumed unchanged), and the entire existing Vitest + E2E suite.

### Learnings carried from Epic 1 (apply them)

- **Single-owner via context, not a shared hook** — Epic 1's ad-hoc per-component state caused the races; the store fixes that class of bug. Keep per-item view state local; put collection state in the store.
- **Pure reducer = unit-testable without RTL** — this is the Epic 1 action item ("component-test harness") addressed the cheap way: extract the state logic as a pure function and unit-test it directly.
- **E2E network interception** (`page.route`) makes empty/error/loading states deterministic without touching the DB — the right tool for these state tests.
- **Regression guard:** the existing 6 E2E specs assert real behaviours through the UI; keep every label/role/text identical so they pass unchanged. Run them.
- **E2E hygiene (Epic 1):** wait for loading to clear before interacting; role-based + exact locators; per-row names include task text. `webServer` boots `npm run dev` (needs `DATABASE_URL`).
- **Test infra:** `fileParallelism:false`; integration migrate + truncate + gate on `TEST_DATABASE_URL`. Node 24; git initialized (no `git init`); **no new dependencies** (hand-rolled store — do NOT add React Query/SWR/Zustand; if you believe one is needed, HALT and ask).
- **Deferrals that touch this area:** client fetch abort/timeout is **Story 2.2** (don't add it here); the store is where it will live.

### Latest tech information

- **React 19 + Next 16**: use `useReducer` + `createContext`/`useContext` for the provider; `"use client"` on the store module. No new packages — hand-rolled per AD-14's "chosen at scaffold" (we choose a minimal hand-rolled store to honour the simplicity mandate).
- **Playwright `page.route`**: intercept `**/api/todos` to fulfil `[]` (empty) or `500` (error); remove the route (`page.unroute`) to test Retry. Deterministic and DB-independent.

### Project Structure Notes

- Finally populates `lib/store/` (the spine seed's "single client-side todo-collection owner (AD-14)") — replacing the 1.1 placeholder. No new top-level structure.

### References

- [Source: planning-artifacts/epics.md#Story-2.1] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-14] single client-side owner of the todo collection (data + loading/error/optimistic + sort)
- [Source: .../ARCHITECTURE-SPINE.md#Consistency-Conventions] empty/loading/error are explicit store-owned render states
- [Source: .../ARCHITECTURE-SPINE.md#AD-7] optimistic/rollback is deferred to Story 2.2 (this is the baseline)
- [Source: .../ARCHITECTURE-SPINE.md#AD-1/AD-2] layering; [#AD-8] plain errors; [#AD-11] XSS-safe
- [Source: implementation-artifacts/1-3-create-and-view-tasks-with-validation.md] `lib/todos-client.ts` written as the store's data layer; component structure; E2E patterns; `fileParallelism:false`
- [Source: implementation-artifacts/1-4…1-6] single-editor, in-flight guards, per-row accessible names, delete-confirm UI to preserve
- [Source: implementation-artifacts/epic-1-retro-2026-07-06.md] action item: make UI logic unit-testable (pure reducer); React-race pain motivates the single store
- [Source: _bmad-output/project-context.md] AD-14 single owner; explicit states; optimistic deferred to Epic 2; no hardcoded voice (Epic 3); bias to simplicity (no new deps)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **AD-14 as a context provider, not a bare hook.** `useTodoStore()` reads a single `TodoStoreContext` instance owned by `TodoStoreProvider`; a plain hook would have instantiated a separate owner per component. The provider runs the one initial fetch (unmount-guarded) and owns all mutations.
- **Pure reducer** (`loading` | `ready` | `error`, with `append`/`upsert`/`remove` operating on a ready list) is exported and unit-tested with **9 cases, no DOM/React** — directly addressing the Epic 1 action item "make UI logic unit-testable" without adding a component-test harness.
- **Empty is derived** (`status === "ready" && todos.length === 0`), not a status.
- **Regression preserved:** kept every Epic 1 accessible name/role/text (input `New task`, `Add task`, `Completed: <text>`, Edit/Save/Cancel, `Delete: <text>`, `Confirm/Cancel delete: <text>`, `No tasks yet.`, `.todo-done` + `data-completed`, single-editor, in-flight guards). All 7 Epic 1 E2E specs pass unchanged.
- Removed an unused `eslint-disable react-hooks/exhaustive-deps` directive (lint clean, 0 warnings).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Story complete and verified.** All 3 ACs, 4 tasks / 17 subtasks satisfied.
- **What was built:** `lib/store/todo-store.tsx` — the AD-14 single owner: a pure `todoReducer` + `TodoStoreProvider` (owns the initial fetch + `create`/`update`/`remove` + `retry`) + `useTodoStore()`. `app/todo-app.tsx` refactored into a consumer: `TodoApp` wraps `<TodoStoreProvider>`; `TodoView` renders four distinct states (loading / error+Retry / empty / list); `TodoItem` calls the store. No component fetches todos independently anymore.
- **Mutations are non-optimistic** (await → apply) as scoped; the store is structured so Story 2.2 can wrap it with optimistic apply + rollback (+ `tempId`/FR-11), and Story 2.3 can add sort.
- **Verification:** typecheck ✅ · lint ✅ (0 warnings) · **100/100 Vitest** vs real Postgres 18 (9 new reducer unit tests); **9 E2E pass** on Chromium (2 new states specs + all 7 Epic 1 specs — zero regression).
- **Scope fences honoured:** no optimistic updates (→ 2.2), no sort (→ 2.3), no responsive (→ 2.4), no voice (→ Epic 3); no API/route/schema/wrapper changes; no new dependencies (hand-rolled store).

### File List

**New:**
- `lib/store/todo-store.tsx` — pure `todoReducer` + `TodoStoreProvider` + `useTodoStore` (AD-14 single owner)
- `tests/unit/todo-store.test.ts` — reducer unit tests (9 cases)
- `tests/e2e/states.spec.ts` — empty + error/Retry states via network interception

**Modified:**
- `app/todo-app.tsx` — refactored to consume the store; renders loading/error/empty/list; components call store actions
- `lib/store/index.ts` — re-exports the store (replaced the scaffold placeholder)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | Story 2.1 drafted (ready-for-dev): single client-side todo store (pure reducer + context provider) owning the collection + loading/empty/error states; refactor todo-app.tsx to consume it; reducer unit test + empty/error E2E via network interception. |
| 2026-07-06 | Story 2.1 implemented: `lib/store/todo-store.tsx` (AD-14 single owner — pure reducer + provider + hook); `todo-app.tsx` refactored to a consumer with distinct loading/error(+Retry)/empty/list states. 100/100 Vitest (9 new reducer tests), 9 E2E pass (2 new + 7 Epic 1 regression, zero breakage), lint clean. Status → review. |
| 2026-07-07 | Automate: +1 loading-state E2E (loading/empty/error trio complete). Code review (3 layers, ACs pass, no regression): 4 patches applied (load generation-token race guard; mounted-guarded mutation dispatches; editingId dangle-safe by derivation; error-recovery E2E asserts ready; `update`→void), 1 deferred (reconcile-after-mutation-when-not-ready → 2.2), 4 dismissed. Post-fix 100/100 Vitest + 10 E2E green. Status → done. |
