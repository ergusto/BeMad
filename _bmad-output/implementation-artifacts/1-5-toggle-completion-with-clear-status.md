---
baseline_commit: NO_VCS
---

# Story 1.5: Toggle completion with clear status

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to mark a task complete or active again,
so that I can track what's done at a glance.

## Acceptance Criteria

1. **Given** a task in the list, **when** I toggle its completion control, **then** `PATCH /api/todos/[id]` with `{ completed }` persists the new status.
2. **And** completed tasks are visually distinct from active ones (FR-6).
3. **And** completion is bi-directional (a completed task can be reactivated).

## Tasks / Subtasks

- [x] **Task 1 — Toggle control in the list UI** (AC: #1, #3)
  - [x] In `app/todo-app.tsx` `TodoItem`, add a completion control — a native checkbox (`<input type="checkbox">`) reflecting `todo.completed`. On change, call `updateTodo(todo.id, { completed: !todo.completed })` and replace the item in state via the existing `onUpdated` callback.
  - [x] Bi-directional by construction (`!todo.completed`). Guard against re-entry while a toggle request is in flight (a per-item `toggling` state; disable the checkbox while pending), mirroring the save-in-flight discipline.
  - [x] On failure, surface the item's plain error and leave the checkbox reflecting the true (unchanged) server state — do NOT optimistically flip (optimistic updates are Story 2.2).
  - [x] **Accessibility (AD-10):** the checkbox has a **stable, descriptive** accessible name (e.g. `aria-label="Completed"`); the checked state conveys on/off — do not encode state in a rotating/changing label. (Voice/rotation is Epic 3; checkboxes are excluded from rotation per FR-16.)
  - [x] Do NOT change the route, schema, or client wrapper — `PATCH /api/todos/[id]`, `updateTodoSchema` (`{completed?}`), and `updateTodo(id, input)` already support this from Story 1.4. Toggling while a row is being text-edited is out of scope (the single-editor UI keeps these distinct).
- [x] **Task 2 — Completed visual distinction** (AC: #2)
  - [x] Style completed tasks distinctly (e.g. line-through + muted color) via a CSS class in `app/globals.css` applied to the task text when `todo.completed` is true. Use CSS for the visual treatment — never store styled/shouty strings (AD-10). Keep it simple.
- [x] **Task 3 — Tests** (AC: #1, #2, #3)
  - [x] **UPDATE** `tests/integration/todos-id-route.test.ts` — add a bi-directional toggle test: create a todo, `PATCH {completed:true}` → 200 + `completed:true` (persists), then `PATCH {completed:false}` → 200 + `completed:false` (persists). (Text-preservation on a completed-only update is already covered by Story 1.4's test.)
  - [x] **NEW** `tests/e2e/toggle-complete.spec.ts` — Playwright: create a task, toggle its checkbox on → the row shows the completed styling; **reload → still completed**; toggle off → active again; **reload → still active**. Wait for loading to clear before interacting; scope locators to the specific row (`page.locator("li", { hasText: unique })`).
  - [x] Typecheck + lint clean; full Vitest suite green with `TEST_DATABASE_URL` set; no regressions (create/edit/health/repository/schema tests + existing E2E). Keep `fileParallelism:false`.

## Review Findings

_Code review 2026-07-06 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 3 ACs + invariants (AD-1/2/4/5/6/10/11) **pass**. Blind + Edge converged on the toggle+edit race. Triage: 0 decision-needed, 3 patch, 1 deferred, 5 dismissed._

- [x] [Review][Patch] Concurrent toggle+edit race: the checkbox is disabled while a toggle PATCH is in flight, but the "Edit" button is NOT — a user can start editing + save during an in-flight toggle, so two full-object PATCH responses race and last-response-wins can revert the text edit in the UI (DB stays correct; UI desyncs until reload). Fix: disable the Edit button while `toggling` [app/todo-app.tsx]
- [x] [Review][Patch] All completion checkboxes share the static `aria-label="Completed"` → a screen-reader user hears "Completed, checkbox" N times with no way to tell which task (WCAG/NFR-4). Fix: give each checkbox a per-row descriptive accessible name incorporating the task text (still stable — text doesn't rotate) [app/todo-app.tsx]
- [x] [Review][Patch] `.todo-done` dims completed text with `opacity: 0.6`, risking sub-AA contrast (esp. dark mode) ahead of the Story 4.2 axe audit. Line-through already conveys "done". Fix: drop the opacity (keep line-through), or use an AA-compliant muted color [app/globals.css]
- [x] [Review][Defer] Toggle-failure UI path (error surfaced, checkbox left at true server state) is implemented and confirmed correct by the Edge Hunter, but untested — a dedicated test needs a component-test harness (React Testing Library = a new dependency). Deferred: add when a component harness is introduced; the path structurally mirrors the edit-failure path [app/todo-app.tsx]

_Dismissed (with evidence): E2E `getByText(/loading/i).toHaveCount(0)` is a negative gate — but the positive locators that follow (`row` visible, `getByRole("checkbox")`) provide the real synchronization (auto-retry), so specs are reliable; the `if (toggling) return` re-entry guard is "dead" because `disabled={toggling}` suppresses `onChange` — intentional belt-and-suspenders, harmless; `error` state shared between toggle and edit — after the Edit-disabled-during-toggle fix you cannot start editing mid-toggle, and a single interaction per item is acceptable; a toggle that succeeds server-side but whose response is lost/garbled leaves the checkbox stale — inherent to non-optimistic + no-abort, self-heals on reload; the broader abort/optimistic handling is the Story 2.2 deferred item (`deferred-work.md`); E2E data-leak/no-teardown — already tracked under the Story 1.4 E2E-isolation defer for Story 4.1._

**Resolution (2026-07-06):** all 3 patch findings applied and verified. (1) the "Edit" button is now `disabled={toggling}` — closes the toggle+edit concurrent-PATCH race. (2) the checkbox accessible name is now per-row (`aria-label={`Completed: ${todo.text}`}`) — screen-reader-distinguishable, still stable. (3) `.todo-done` drops the `opacity` dimming (keeps line-through) — no sub-AA contrast risk ahead of the 4.2 axe audit. Post-fix: typecheck + lint clean; **85/85 Vitest**; **6 E2E pass** on Chromium (toggle spec uses `getByRole("checkbox")`, unaffected by the aria-label change). The 1 deferred item (toggle-failure UI test) is recorded in `deferred-work.md`.

## Dev Notes

### Why this story is small

The API side is already done. Story 1.4 built `PATCH /api/todos/[id]` as a **general partial update** (`updateTodoSchema` = `{text?, completed?}`, ≥1 field) and `repository.update` sets only provided fields (so toggling `completed` never touches `text` — proven by Story 1.4's test). The `updateTodo(id, input)` client wrapper accepts `{ completed }`. **This story is UI + styling + tests only** — do not re-implement or modify the route/schema/wrapper.

### Architecture compliance (guardrails)

- **AC1/AD-4:** toggle → `PATCH /api/todos/[id]` `{ completed }` → 200 + updated `Todo`. (Route unchanged.)
- **AD-10 accessibility (FR-6/NFR-4):** completed styling comes from **CSS**, not stored strings; the checkbox exposes a **stable** accessible name; state is conveyed by the checkbox's checked state, not by a mutating label. Rotation never alters state-bearing text (FR-17) — relevant when the voice pack lands in Epic 3; for now keep the control plainly labelled.
- **AD-5/AD-6:** the `{completed}` payload is validated by the shared `updateTodoSchema` server-side (already in place); the client sends a boolean.
- **AD-1/AD-2:** UI calls the API via `updateTodo`; never imports `lib/db`.
- **AD-11:** task text still rendered via React escaping; no `dangerouslySetInnerHTML`.

### Scope fences (do NOT build here)

- **Optimistic toggle** (instant flip + rollback) → **Story 2.2**. Here: await the PATCH, then apply the returned todo (a brief disabled state during the request is fine).
- **DELETE** → Story 1.6. **Single client store / full state machine** → 2.1. **Sort** (incl. active-before-completed) → 2.3. **Voice pack** → Epic 3.
- No route/schema/wrapper changes.

### Files this story touches

- **UPDATE:** `app/todo-app.tsx` (toggle checkbox + completed styling hook), `app/globals.css` (completed style), `tests/integration/todos-id-route.test.ts` (bi-directional toggle test)
- **NEW:** `tests/e2e/toggle-complete.spec.ts`
- **PRESERVE (no regression):** `app/api/todos/[id]/route.ts`, `updateTodoSchema`, `lib/todos-client.ts`, repository, and the Story 1.4 single-editor / guard behavior.

### Learnings carried from Stories 1.1–1.4 (apply them)

- **Single-editor UI** (Story 1.4 review): edit mode is a single active editor via `editingId` in `TodoApp`. The toggle checkbox is independent of edit mode — a row not being edited still shows its checkbox. Don't reintroduce per-row duplicate-control ambiguity.
- **In-flight guards** (Stories 1.3/1.4): guard the toggle against re-entry (`toggling` flag; disable the checkbox while pending), like the create/edit handlers.
- **E2E** (Stories 1.3/1.4): `webServer` boots `npm run dev` (needs `DATABASE_URL`); wait for the loading state to clear before interacting; scope row locators by unique text; a checkbox's state is asserted via `toBeChecked()`. Browsers via `npx playwright install`. (E2E test-DB isolation deferred to Story 4.1 — `deferred-work.md`.)
- **Test infra:** `fileParallelism:false` stays; integration tests migrate + truncate + gate on `TEST_DATABASE_URL`.
- **No new dependencies** expected (HALT if you think one is needed). Git already initialized (no `git init`); Node 24.

### Latest tech information

- No new packages. Reuse `updateTodo` (Story 1.3/1.4) for the `PATCH` call. Native `<input type="checkbox">` is the control; React controlled component (`checked` + `onChange`).
- The `PATCH` route (`app/api/todos/[id]/route.ts`) and `updateTodoSchema` already accept `{ completed }` — verified in Story 1.4 (a `{completed:true}` integration test passes and preserves `text`).

### Project Structure Notes

- No new modules or routes; only the client component + a stylesheet rule + tests. Matches the spine seed.

### References

- [Source: planning-artifacts/epics.md#Story-1.5] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-4] PATCH partial-update contract (already implemented)
- [Source: .../ARCHITECTURE-SPINE.md#AD-10] accessibility contract (CSS for visual treatment, stable accessible names)
- [Source: .../ARCHITECTURE-SPINE.md#AD-5] shared schema; [#AD-11] XSS-safe rendering; [#AD-1/2] layering
- [Source: implementation-artifacts/1-4-edit-a-tasks-text-in-place.md] general PATCH route + `updateTodo`; single-editor UI; in-flight guards; completed-only update preserves text
- [Source: implementation-artifacts/1-3-create-and-view-tasks-with-validation.md] `todo-app.tsx` structure, E2E patterns, `fileParallelism:false`
- [Source: _bmad-output/project-context.md] FR-6 completed distinct; a11y (caps via CSS, stable aria); optimistic UI deferred to Epic 2; no hardcoded voice (Epic 3)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **API side unchanged** as scoped: `PATCH /api/todos/[id]`, `updateTodoSchema`, and `updateTodo(id, input)` already accepted `{completed}` (built general in Story 1.4). This story added only UI + CSS + tests.
- **E2E checkbox interaction**: used `checkbox.click()` (not `.check()`) because the control disables itself mid-request (`disabled={toggling}`), which can trip `.check()`'s stricter actionability semantics. Asserted state via `toBeChecked()` and the completed styling via the `data-completed` attribute on the `<li>`.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Story complete and verified.** All 3 ACs, 3 tasks / 12 subtasks satisfied.
- **What was built:** a completion checkbox per row in `TodoItem` (controlled, `aria-label="Completed"`, disabled while the toggle request is in flight, no optimistic flip); bi-directional via `!todo.completed`; item-level error surfaced on failure. Completed styling via a `.todo-done` CSS class (line-through + muted) applied to the task text, plus a `data-completed` attribute on the `<li>` (FR-6, AD-10 — CSS not stored strings).
- **API untouched** (route/schema/wrapper reused from 1.4), honouring the scope.
- **Verification:** typecheck ✅ · lint ✅ · **84/84 Vitest** vs real Postgres 18 (added a bi-directional toggle integration test); **6 E2E pass** on Chromium (added toggle-complete: on→reload→still on→off→reload→still off, with completed styling asserted).
- **Scope fences honoured:** no optimistic toggle (→ 2.2), no store (→ 2.1), no sort (→ 2.3), no DELETE (→ 1.6), no voice (→ Epic 3), no route/schema/wrapper changes.

### File List

**New:**
- `tests/e2e/toggle-complete.spec.ts` — toggle on/off + reload-persist + completed-styling E2E

**Modified:**
- `app/todo-app.tsx` — completion checkbox + `toggleCompleted` handler + `todo-done`/`data-completed` styling hooks in `TodoItem`
- `app/globals.css` — `.todo-done` completed style (line-through + muted)
- `tests/integration/todos-id-route.test.ts` — bi-directional toggle test
- `tests/unit/todos-client.test.ts` — `updateTodo` completed-only body test (added during test-automation expansion)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | Story 1.5 drafted (ready-for-dev): toggle-completion checkbox + completed styling (CSS) + bi-directional toggle; reuses the general PATCH route/`updateTodo` from 1.4. UI + tests only. |
| 2026-07-06 | Story 1.5 implemented: completion checkbox in `TodoItem` (controlled, in-flight-guarded, bi-directional), `.todo-done` + `data-completed` completed styling (AD-10). API reused unchanged. 84/84 Vitest vs real Postgres 18; 6 E2E pass on Chromium. Status → review. |
| 2026-07-06 | Automate: +1 unit (`updateTodo` completed-only body); 85 Vitest. Code review (3 layers, ACs pass): 3 patches applied (disable Edit during toggle, per-row checkbox aria-label, drop `.todo-done` opacity), 1 deferred (toggle-failure UI test), 5 dismissed. Post-fix 85/85 Vitest + 6 E2E green. Status → done. |
