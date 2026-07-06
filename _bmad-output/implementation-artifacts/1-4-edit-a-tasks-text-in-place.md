---
baseline_commit: NO_VCS
---

# Story 1.4: Edit a task's text in place

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to edit a task's text inline,
so that I can fix or refine a task without recreating it.

## Acceptance Criteria

1. **Given** an existing (server-confirmed) task, **when** I edit its text and save, **then** `PATCH /api/todos/[id]` with `{ text }` validates via the shared schema and persists the change, and the list shows the updated text.
2. **And** an empty/invalid edit is rejected with the standard error envelope (`{ error: { code, message } }`, 4xx) and the prior text is retained in the UI.
3. **And** the item route follows AD-4: `PATCH /api/todos/[id]` is a partial update (`{ text?, completed? }`, ≥1 field) → `200` + the updated `Todo`; a missing/unknown id → `404` with the envelope; malformed JSON → `400`.

## Tasks / Subtasks

- [x] **Task 1 — Add `NOT_FOUND` to the shared error enum** (AC: #3)
  - [x] Extend `ErrorCode` in `lib/http.ts` with `"NOT_FOUND"` (kept for the `[id]` routes; the client maps it to voiced copy in Epic 3). No other change to `lib/http.ts`.
- [x] **Task 2 — Item route handler `app/api/todos/[id]/route.ts` — PATCH** (AC: #1, #2, #3)
  - [x] Create the item route with `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"`.
  - [x] **Next 16 async params:** the handler signature is `PATCH(request: Request, context: { params: Promise<{ id: string }> })` and you MUST `const { id } = await context.params` (params is a Promise in Next 15+/16 — confirm at build). 
  - [x] Parse the body in try/catch → `jsonError("INVALID_JSON", …, 400)` on failure. Validate with `updateTodoSchema.safeParse(body)` (AD-4/AD-6 — partial, ≥1 field, trim, ≤1000 code points, no NUL) → `jsonError("VALIDATION_ERROR", <plain issue message>, 400)` on failure.
  - [x] On success call `getRepository().update(id, parsed.data)`. If it returns `null` (unknown **or malformed** id — the repository already guards non-UUID ids → null, Story 1.2), return `jsonError("NOT_FOUND", …, 404)`. Otherwise `Response.json(updatedTodo, { status: 200 })`.
  - [x] Wrap the repository call in try/catch → `jsonError("INTERNAL", …, 500)`. Reach data ONLY via `getRepository()` (AD-1/AD-2).
  - [x] **Build the route general (partial update handles `text` AND `completed`)** — `updateTodoSchema` + `repository.update` already support both. Story 1.5 (toggle) reuses this exact handler and only adds the toggle UI; do not restrict it to `text` only. `DELETE` is added in Story 1.6 (do NOT add it here).
- [x] **Task 3 — Client wrapper `updateTodo`** (AC: #1, #2)
  - [x] Add `updateTodo(id: string, input: UpdateTodoInput): Promise<Todo>` to `lib/todos-client.ts` → `PATCH /api/todos/${id}` with a JSON body; reuse the existing `toApiError`/`parseJson` helpers (error envelope → `TodoApiError`; malformed success body → `TodoApiError`).
- [x] **Task 4 — Inline edit UI** (AC: #1, #2)
  - [x] In `app/todo-app.tsx`, add per-item inline editing: an "Edit" control puts the row into edit mode with an input pre-filled with the current text; "Save" validates client-side with the shared schema (`createTodoSchema`/`todoTextSchema`) and calls `updateTodo(id, { text })`, then replaces that todo in local state with the returned one; "Cancel" exits edit mode unchanged.
  - [x] **On invalid edit or save failure, retain the prior text** (AC #2) — show the plain error message; do not mutate the stored todo. Reuse the same guard discipline from Story 1.3 (don't submit while a save is in flight).
  - [x] Render edited text via React escaping only — never `dangerouslySetInnerHTML` (AD-11). Keep the accessible name of the edit input stable/descriptive.
  - [x] Keep it minimal — no optimistic update (that's Story 2.2; here: save → await → replace in state). Plain copy (voice is Epic 3).
- [x] **Task 5 — Tests** (AC: #1–#3)
  - [x] **NEW** `tests/integration/todos-id-route.test.ts` — PATCH handler vs real Postgres (migrate + truncate): create a todo, `PATCH {text:"new"}` → 200 + updated text (and it persists on a subsequent `GET`/`get`); `PATCH {text:""}` / whitespace / >1000 / NUL → 400 `VALIDATION_ERROR`; empty body `{}` → 400 (≥1-field rule); malformed JSON → 400 `INVALID_JSON`; unknown but valid UUID → 404 `NOT_FOUND`; **malformed (non-UUID) id → 404** `NOT_FOUND` (not a 500). Gate on `TEST_DATABASE_URL`.
  - [x] **UPDATE** `tests/unit/todos-client.test.ts` — `updateTodo` posts to `/api/todos/:id` (mocked fetch), returns the updated todo, and throws `TodoApiError` (with code) on a non-ok envelope.
  - [x] **NEW** `tests/e2e/edit-in-place.spec.ts` — Playwright: create a task, edit its text inline, save, see the new text; **reload → the edit persists**. Wait for the loading state to clear before interacting (hydration), and scope alert/error assertions to specific text (Next renders its own `role="alert"` announcer — Story 1.3 learning).
  - [x] Typecheck + lint clean; full Vitest suite green with `TEST_DATABASE_URL` set; no regressions. (Integration files run sequentially via `fileParallelism:false` — Story 1.3 fix; keep it.)

## Review Findings

_Code review 2026-07-06 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 3 ACs + invariants (AD-1/2/4/5/6/8/11) **pass** (verified against the repository code). Edge Hunter (with project access) confirmed the route is well-guarded, refuting the Blind Hunter's two "High" findings. Triage: 0 decision-needed, 6 patch, 1 deferred, 6 dismissed._

- [x] [Review][Patch] Multiple rows can enter edit mode at once (each `TodoItem` owns independent `editing` state) → N inputs share `aria-label="Edit task"` and N "Save" buttons: an a11y ambiguity and a Playwright strict-mode hazard (the E2E `getByLabel("Edit task")` assumes one active editor). Fix: enforce a single active editor by lifting `editingId` to `TodoApp` [app/todo-app.tsx]
- [x] [Review][Patch] On initial-load failure the UI shows the error alert AND "No tasks yet." simultaneously (contradictory) — `error` set + `loading` false + `todos` empty. Fix: suppress the empty-state while an error is present [app/todo-app.tsx]
- [x] [Review][Patch] Server `INTERNAL` catch blocks swallow errors with no logging → opaque 500s with no diagnostic signal (project-context wants structured server logs). Fix: `console.error` the caught error in the data routes' INTERNAL catches [app/api/todos/route.ts, app/api/todos/[id]/route.ts]
- [x] [Review][Patch] `updateTodo` interpolates `id` into the URL without `encodeURIComponent` — safe for server UUIDs today, but a general wrapper should encode the path segment [lib/todos-client.ts]
- [x] [Review][Patch] The inline-edit client mirror validates with `createTodoSchema`; use `updateTodoSchema` for exact parity with the server's PATCH validation (both share `todoTextSchema`, so behaviour is identical today — this is a fidelity/clarity fix) [app/todo-app.tsx]
- [x] [Review][Patch] Test gap: the completed-only PATCH test asserts `completed:true` but never re-reads to confirm `text` survived (proves the partial update doesn't wipe `text`). Fix: assert `text` preserved [tests/integration/todos-id-route.test.ts]
- [x] [Review][Defer] No client-side fetch timeout/`AbortController`: if a PATCH/POST hangs, `saving`/`submitting` never clears and the row is stuck (Cancel is disabled during save). Deferred to Story 2.2, whose optimistic + rollback layer owns in-flight/abort handling [lib/todos-client.ts, app/todo-app.tsx]

_Dismissed (with evidence): "malformed id → likely 500 not 404" (Blind, refuted) — `repository.update` guards non-UUID ids with `UUID_RE` → null → 404, and the integration test passes; "completed-only update wipes text" (Blind, refuted) — the repository builds the SET clause only from provided fields, so text is untouched (the patch adds a test asserting this); client `parseJson` cast without full shape re-validation & non-array crash — over-engineering for a same-origin, server-validated API (consistent with the Story 1.3 decision); `toLocaleString` "Invalid Date"/non-determinism — the server contract guarantees a valid ISO string; integration test passes id via `ctx()` not the URL — that IS how Next supplies `params`, and the wired route is covered by the E2E; `draft` not re-synced while editing / lost-update if returned id absent — unreachable until Story 2.1's shared store, noted for then._

**Resolution (2026-07-06):** all 6 patch findings applied and verified. (1) `editingId` lifted to `TodoApp` — a single active editor, no duplicate `aria-label="Edit task"`. (2) empty-state suppressed when `error` is set. (3) `console.error` added to the data-route `INTERNAL` catches. (4) `updateTodo` uses `encodeURIComponent(id)`. (5) inline-edit mirror now uses `updateTodoSchema` (exact server parity). (6) completed-only PATCH test now asserts `text` is preserved (proves no wipe). Post-fix: typecheck + lint clean; **83/83 Vitest** vs real Postgres 18; **5 E2E pass** on Chromium. The 1 deferred item (client fetch timeout/abort) is recorded in `deferred-work.md` for Story 2.2.

## Dev Notes

### What this story adds (first `[id]` route)

The item route `app/api/todos/[id]/route.ts` is NEW. It consumes what earlier stories built:

- `getRepository().update(id, patch)` (Story 1.2) — already applies a partial update and **returns `null` for a missing OR malformed (non-UUID) id** (the UUID guard added in the 1.2 review). This is why the route maps `null → 404` uniformly and does not itself 500 on a bad id.
- `updateTodoSchema` from `lib/todos` (Story 1.2) — the partial-update validation authority (`{text?, completed?}`, ≥1 field, trim/empty/1000-code-point/NUL rules on `text`). Same schema on server + client (AD-5).
- The collection route (`app/api/todos/route.ts`, Story 1.3) — the pattern for `runtime`/`dynamic`, body-parse try/catch, `jsonError`, and `getRepository()` usage. Copy it.
- `lib/todos-client.ts` + `TodoApiError`/`toApiError`/`parseJson` (Story 1.3) — extend with `updateTodo`.

### Scope fences (do NOT build here)

- **Toggle completion UI** (`{completed}`) → **Story 1.5**. The PATCH route is built general (handles `completed` too) so 1.5 only adds the toggle control + tests — but this story's UI is text-edit only.
- **DELETE** `/api/todos/[id]` → **Story 1.6** (do not add the DELETE handler now).
- **Optimistic update + rollback** (edit restores prior text but keeps typed value) → **Story 2.2**. Here: await the PATCH, then replace in state; on failure keep prior + show error.
- **Single client store / full state machine** → 2.1. **Sort** → 2.3. **Voice pack + no-literal-strings lint guard** → Epic 3 (plain copy is expected now). **XSS security test** → 4.3.

### Architecture compliance (guardrails)

- **AD-4:** `PATCH /api/todos/[id]`, partial (`{text?, completed?}`, ≥1 field), `200` + updated `Todo`; errors via `{ error: { code, message } }` with a shared `code`. `404` for missing/unknown id.
- **AD-5/AD-6:** one `updateTodoSchema`, server-authoritative on the handler, mirrored on the client; repository is the sole mapper.
- **AD-1/AD-2:** route reaches data only via `getRepository()`; UI never imports `lib/db`.
- **AD-8:** error `code`/`message` plain; no voice.
- **AD-11:** edited text rendered via React escaping; no `dangerouslySetInnerHTML`.
- **FR-3:** edit a task's text in place (this story). Note **FR-11** (no mutations on a task without a server `id`) is enforced structurally in Story 2.2's optimistic layer; here every rendered todo already has a server id (they come from the API), so edit is always on a confirmed task.

### Files this story touches

- **NEW:** `app/api/todos/[id]/route.ts` (PATCH), `tests/integration/todos-id-route.test.ts`, `tests/e2e/edit-in-place.spec.ts`
- **UPDATE:** `lib/http.ts` (+`NOT_FOUND`), `lib/todos-client.ts` (+`updateTodo`), `app/todo-app.tsx` (inline edit), `tests/unit/todos-client.test.ts` (+`updateTodo`)
- **PRESERVE (no regression):** collection route, repository, schema, health, all prior tests, the Story 1.3 component guards (submit/loading guards) and E2E hydration-waits.

### Learnings carried from Stories 1.1–1.3 (apply them)

- **Next 15+/16 dynamic route params are async** — `const { id } = await context.params`. Typing: `context: { params: Promise<{ id: string }> }`. (Confirm at build; this is the most common 1.4 mistake.)
- **Malformed id is already handled in the repository** (returns `null`) — the route just maps `null → 404`. Do NOT re-implement UUID validation in the route (and don't let a bad id reach a raw DB error).
- **Zod 4**: `updateTodoSchema.safeParse`; surface `result.error.issues[0]?.message` (guard for `noUncheckedIndexedAccess`).
- **Test infra**: `fileParallelism:false` is set (keep it) so the new integration file doesn't clobber the others on the shared test DB; migrate via `drizzle-orm/postgres-js/migrator`; truncate between tests; gate on `TEST_DATABASE_URL`.
- **E2E**: `webServer` boots `npm run dev` (needs `DATABASE_URL`); wait for loading to clear before interacting; scope `role="alert"` assertions to specific text (Next renders `__next-route-announcer__` with `role="alert"`). Browsers via `npx playwright install`. (E2E test-DB isolation/cleanup is deferred to Story 4.1 — see `deferred-work.md`.)
- **Client wrapper**: reuse `parseJson`/`toApiError` (Story 1.3) — don't re-implement error handling.
- **Env/tooling**: git already initialized (no `git init`); Node 24; no new dependencies expected (HALT if you think one is needed).

### Latest tech information

- **Next 16 dynamic Route Handler**: `export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> })`, `const { id } = await ctx.params`. `Response.json(data, { status })`. Segment config `runtime`/`dynamic` as in the collection/health routes.
- No new packages needed — `updateTodoSchema`, `repository.update`, `getRepository`, and the client helpers already exist from Stories 1.2–1.3.

### Project Structure Notes

- Adds the `[id]` segment under `app/api/todos/` per the spine seed (`app/api/todos/[id]/route.ts`). `DELETE` joins it in Story 1.6.

### References

- [Source: planning-artifacts/epics.md#Story-1.4] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-4] PATCH partial-update contract + error envelope + 404
- [Source: .../ARCHITECTURE-SPINE.md#AD-5] shared updateTodoSchema (server + client)
- [Source: .../ARCHITECTURE-SPINE.md#AD-6] server-authoritative validation
- [Source: .../ARCHITECTURE-SPINE.md#AD-1] layering; [#AD-2] single repository; [#AD-11] XSS-safe
- [Source: implementation-artifacts/1-2-todo-data-model-shared-zod-schema-repository.md] repository `update()` + null-on-malformed-id, `updateTodoSchema`
- [Source: implementation-artifacts/1-3-create-and-view-tasks-with-validation.md] collection route pattern, `lib/http.ts`, `lib/todos-client.ts` helpers, component submit/loading guards, E2E waits/locator learnings, `fileParallelism:false`
- [Source: _bmad-output/project-context.md] strict TS, error boundaries, no hardcoded voice (Epic 3), optimistic UI deferred to Epic 2

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **Next 16 async params** confirmed: `PATCH(request, context: { params: Promise<{ id: string }> })` with `const { id } = await context.params` — typechecks and the route works at runtime.
- **Malformed-id → 404** works without route-level UUID validation: `repository.update()` returns `null` for a non-UUID id (Story 1.2 guard), so the route maps `null → 404` for both unknown and malformed ids (integration-tested).
- **E2E locator fix:** the edit-in-place spec initially scoped the edit input via `page.locator("li", { hasText: original })`, but once the row enters edit mode the `<span>` becomes an `<input>` (whose *value* isn't matched by `hasText`), so the locator went stale. Switched to page-level `getByLabel("Edit task")` / Save button (only one row edits at a time) — passes fast.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Story complete and verified.** All 3 ACs, 5 tasks / 21 subtasks satisfied.
- **What was built:** `app/api/todos/[id]/route.ts` `PATCH` (general partial update via `updateTodoSchema`, `null → 404`, `INVALID_JSON`/`VALIDATION_ERROR`/`NOT_FOUND`/`INTERNAL`); `NOT_FOUND` added to the shared `ErrorCode`; `updateTodo(id, input)` client wrapper; inline-edit UI (`TodoItem` component in `app/todo-app.tsx`) with Save/Cancel, client validation mirror, and prior-text retention on invalid/failed edits.
- **Route built general** (handles `text` AND `completed`) so Story 1.5 reuses it for toggle — integration test proves a `{completed:true}` PATCH works.
- **AD-11:** edited text rendered via React escaping; no `dangerouslySetInnerHTML`.
- **Verification:** typecheck ✅ · lint ✅ · **81/81 Vitest** vs real Postgres 18 (PATCH integration + client unit + prior suites); 51 pass / 30 skip without a DB. **3 E2E pass** on Chromium (edit-in-place, create-view, validation).
- **Scope fences honoured:** PATCH only (no DELETE → 1.6); text-edit UI only (toggle UI → 1.5); no optimistic update (→ 2.2); no store/state-machine (→ 2.1); plain copy (→ Epic 3).

### File List

**New:**
- `app/api/todos/[id]/route.ts` — `PATCH` item handler (general partial update)
- `tests/integration/todos-id-route.test.ts` — PATCH handler vs real Postgres
- `tests/e2e/edit-in-place.spec.ts` — inline edit + reload-persist E2E
- `tests/e2e/edit-cancel.spec.ts` — cancel-retains + invalid-edit-retains E2E (added during test-automation expansion)

**Modified:**
- `lib/http.ts` — `NOT_FOUND` added to `ErrorCode`
- `lib/todos-client.ts` — `updateTodo(id, input)` wrapper
- `app/todo-app.tsx` — inline-edit UI (`TodoItem` component)
- `tests/unit/todos-client.test.ts` — `updateTodo` unit tests

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | Story 1.4 drafted (ready-for-dev): first `[id]` route (PATCH partial update), `NOT_FOUND` code, client `updateTodo`, inline-edit UI, edit + reload-persist E2E. |
| 2026-07-06 | Story 1.4 implemented: `PATCH /api/todos/[id]` (general partial update, null→404, Next 16 async params); `NOT_FOUND` code; `updateTodo` client wrapper; inline-edit `TodoItem` UI (validation mirror, prior-text retention, AD-11). 81/81 Vitest vs real Postgres 18; 3 E2E pass on Chromium. Status → review. |
| 2026-07-06 | Test-automation expansion (bmad-tea → automate): +4 tests (text+completed, unknown-field-ignored, cancel-retains + invalid-retains E2E). 83 Vitest + 5 E2E (≥5 floor met); coverage 95.55% stmts / 94% branch. |
| 2026-07-06 | Code review (Blind + Edge + Auditor): all ACs/invariants pass; Edge Hunter refuted both Blind "High" findings. 6 patches applied (single-editor, empty-state-on-error, INTERNAL logging, encodeURIComponent, updateTodoSchema mirror, completed-only text-preservation test), 1 deferred (fetch timeout → 2.2), 6 dismissed. Post-fix 83/83 Vitest + 5 E2E green. Status → done. |
