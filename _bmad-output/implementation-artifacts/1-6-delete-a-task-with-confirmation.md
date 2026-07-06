---
baseline_commit: NO_VCS
---

# Story 1.6: Delete a task with confirmation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to delete a task after confirming,
so that I can remove tasks without accidental loss.

## Acceptance Criteria

1. **Given** a task in the list, **when** I trigger delete, **then** a confirmation step is shown before anything is removed.
2. **When** I confirm, **then** `DELETE /api/todos/[id]` removes it (`204`) and it disappears from the list; **when** I cancel, nothing changes.
3. **And** the item route follows AD-4: `DELETE /api/todos/[id]` → `204` (no body) on success; a missing/unknown (or malformed) id → `404` with the error envelope.

## Tasks / Subtasks

- [x] **Task 1 — `DELETE` handler on the item route** (AC: #2, #3)
  - [x] Add `export async function DELETE(request: Request, context: { params: Promise<{ id: string }> })` to `app/api/todos/[id]/route.ts` (alongside the existing `PATCH`; `runtime`/`dynamic` already declared). `const { id } = await context.params`.
  - [x] Call `getRepository().delete(id)`. On `true` → `new Response(null, { status: 204 })` (204 has NO body — do NOT use `Response.json`). On `false` (unknown OR malformed id — the repository's `delete` already guards non-UUID ids → `false`, Story 1.2) → `jsonError("NOT_FOUND", "Task not found.", 404)`.
  - [x] Wrap in try/catch → `console.error(...)` + `jsonError("INTERNAL", "Failed to delete task.", 500)` (match the PATCH catch, logging added in 1.4 review). Reach data ONLY via `getRepository()` (AD-1/AD-2).
- [x] **Task 2 — Client wrapper `deleteTodo`** (AC: #2)
  - [x] Add `deleteTodo(id: string): Promise<void>` to `lib/todos-client.ts` → `fetch(\`/api/todos/${encodeURIComponent(id)}\`, { method: "DELETE" })`. On `!res.ok` throw `await toApiError(res)`; otherwise return (204 has no body — do NOT call `parseJson`).
- [x] **Task 3 — Delete + inline confirmation UI** (AC: #1, #2)
  - [x] In `app/todo-app.tsx` `TodoItem`, add a "Delete" control. Clicking it enters an **inline confirmation** state (do NOT use native `window.confirm` — it can't be voiced/styled in Epic 3 and is harder to make accessible/testable): show a clear prompt (e.g. "Delete this task?") plus **Confirm** and **Cancel** controls with stable, descriptive accessible names (AD-10, and Epic 3 will voice this confirm/cancel dialog).
  - [x] **Cancel** returns to the normal row unchanged (nothing removed) — AC #2. **Confirm** calls `deleteTodo(todo.id)` then removes the item from local state via a new `onDeleted(id)` callback on `TodoApp` (`setTodos(prev => prev.filter(t => t.id !== id))`).
  - [x] Guard the in-flight delete (`deleting` state; disable Confirm/Cancel while pending). Apply the Story 1.5 race lesson: while a toggle is in flight, disable Edit/Delete; while confirming/deleting, don't allow toggle/edit to start. On delete failure, surface the item's plain error and keep the task (no optimistic removal — that's Story 2.2).
  - [x] Keep it minimal and plain-copy (voice is Epic 3). Text still rendered via React escaping (AD-11).
- [x] **Task 4 — Tests** (AC: #1, #2, #3)
  - [x] **UPDATE** `tests/integration/todos-id-route.test.ts` — import `DELETE`; add: create a todo, `DELETE` → `204` and `repo.get(id)` is `null` afterwards; `DELETE` an unknown (valid) UUID → `404 NOT_FOUND`; `DELETE` a malformed (non-UUID) id → `404 NOT_FOUND` (not a 500). Gate on `TEST_DATABASE_URL`.
  - [x] **UPDATE** `tests/unit/todos-client.test.ts` — `deleteTodo` resolves on a `204` (mocked fetch, empty body) and throws `TodoApiError` (with code) on a non-ok envelope.
  - [x] **NEW** `tests/e2e/delete-with-confirm.spec.ts` — Playwright: create a task; click Delete → the confirmation step is shown; **Cancel → the task is still present**; Delete again → **Confirm → the task disappears**; **reload → still gone**. Wait for loading to clear; scope locators to the row by unique text; scope confirm/cancel to the row.
  - [x] Typecheck + lint clean; full Vitest suite green with `TEST_DATABASE_URL` set; no regressions (all prior tests + E2E). Keep `fileParallelism:false`.

## Review Findings

_Code review 2026-07-06 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 3 ACs + invariants (AD-1/2/4/8/10/11) **pass**. Edge Hunter (with project access) verified all delete/toggle/edit guards are closed and refuted the Blind Hunter's malformed-id "High". Triage: 0 decision-needed, 2 patch, 2 deferred, 6 dismissed._

- [x] [Review][Patch] Stale error banner leaks into the delete-confirm prompt: opening the confirmation (the Delete button's `onClick`) is the only `TodoItem` entry point that doesn't reset the shared `error`, so a prior toggle/edit failure message renders beside "Delete this task?". Fix: clear `error` when opening the confirm prompt [app/todo-app.tsx]
- [x] [Review][Patch] The destructive delete-confirmation gives no focus cue: clicking Delete removes the focused button and mounts Confirm/Cancel with no focus move, so keyboard/SR users aren't told a confirmation appeared. Fix (cheap, safe default): move focus to the **Cancel** button when the prompt opens (`autoFocus`) [app/todo-app.tsx]
- [x] [Review][Defer] No client fetch timeout/`AbortController`: a hung DELETE leaves the row frozen (Confirm/Cancel disabled during `deleting`). Same root cause as the Story 1.4 defer — the abort/optimistic layer in Story 2.2 owns this [lib/todos-client.ts, app/todo-app.tsx]
- [x] [Review][Defer] Fuller confirm-dialog a11y — focus RETURN to the trigger on cancel + an `aria-live` announcement — deferred to the accessibility work in Story 3.4 / the Story 4.2 axe audit (this story adds the safe focus-on-open default) [app/todo-app.tsx]

_Dismissed (with evidence): "malformed id → likely 500" (Blind, refuted) — the repository `delete` UUID-guards → `false` → 404; the integration test passes and the Edge Hunter confirmed the guard; integration tests skip without `TEST_DATABASE_URL` — already tracked (Story 1.2/1.3 defer: Story 4.2 coverage gate fails if skipped + CI provides the DB); checkbox `aria-label="Completed: <text>"` "misleading" — AD-10 is satisfied (stable descriptive name; the `checked` state conveys on/off; this was the Story 1.5 review outcome); client `parseJson` blind-cast / `TodoApiError.code` arbitrary-string / `toLocaleString` "Invalid Date" — over-engineering for a same-origin server-validated API whose contract guarantees shape + ISO (consistent with Stories 1.3–1.5); unit test doesn't exercise DELETE-URL encoding for special-char ids — ids are always server UUIDs, `encodeURIComponent` is defensive, low value._

**Resolution (2026-07-06):** both patch findings applied and verified. (1) opening the delete confirmation now goes through `startConfirmingDelete()` which clears the shared `error` first, so no stale toggle/edit message renders beside the prompt. (2) the Cancel button `autoFocus`es when the confirmation opens — a safe default for a destructive action that also announces the dialog to keyboard/SR users. Post-fix: typecheck + lint clean (no `no-autofocus` rule fired); **91/91 Vitest**; **7 E2E pass** on Chromium. The 2 deferred items are in `deferred-work.md`.

## Dev Notes

### What this story adds (completes Epic 1 CRUD)

The `DELETE` verb is the only missing CRUD operation. The data layer is ready:

- `getRepository().delete(id)` (Story 1.2) returns `boolean` — `true` if a row was removed, `false` if none matched — and **guards non-UUID ids → `false`** (1.2 review). So the route maps `true → 204`, `false → 404` uniformly, and never 500s on a bad id.
- `app/api/todos/[id]/route.ts` already exists with `PATCH` + `runtime`/`dynamic` + the async-`params` pattern (Story 1.4). Add `DELETE` beside it.
- `lib/todos-client.ts` has `toApiError`/`parseJson` and `TodoApiError` (Story 1.3) — add `deleteTodo` reusing `toApiError`. Note: **204 has no body**, so `deleteTodo` must NOT call `parseJson`.

### Scope fences (do NOT build here)

- **Optimistic delete + rollback** (delete reinserts at original position on failure) → **Story 2.2**. Here: Confirm → await `deleteTodo` → remove from state; on failure keep the task + show error.
- **Single client store / full state machine** → 2.1. **Sort** → 2.3. **Voice pack + voiced confirm/cancel dialog** → Epic 3 (the inline confirm UI built here is where that voiced copy will later live). **XSS security test** → 4.3.
- No changes to `PATCH`, the schema, the repository, or the collection route.

### Architecture compliance (guardrails)

- **AD-4:** `DELETE /api/todos/[id]` → `204` (no body) on success; `404` (envelope) for missing/unknown/malformed id.
- **AD-1/AD-2:** route reaches data only via `getRepository()`; UI never imports `lib/db`.
- **AD-8:** error `code`/`message` plain; no voice. **AD-10:** the confirm/cancel controls have stable, descriptive accessible names (Epic 3 voices them). **AD-11:** text via React escaping.
- **FR-5:** delete requires a confirmation step. **FR-11** (no mutation on a task without a server id) is Story 2.2's optimistic concern; here every rendered task has a server id.

### Files this story touches

- **UPDATE:** `app/api/todos/[id]/route.ts` (+`DELETE`), `lib/todos-client.ts` (+`deleteTodo`), `app/todo-app.tsx` (delete + confirm UI, `onDeleted`), `tests/integration/todos-id-route.test.ts` (+DELETE tests), `tests/unit/todos-client.test.ts` (+`deleteTodo`)
- **NEW:** `tests/e2e/delete-with-confirm.spec.ts`
- **PRESERVE (no regression):** the `PATCH` handler, repository, schema, collection route, and the Story 1.4/1.5 component guards (single-editor, disable-Edit/Delete-during-toggle).

### Learnings carried from Stories 1.1–1.5 (apply them)

- **Repository `delete` already returns `false` for a missing OR malformed id** — the route maps `false → 404`; do NOT re-validate the UUID in the route or let a bad id hit a raw DB error.
- **204 no-content:** use `new Response(null, { status: 204 })`; the client wrapper must not attempt to parse a body.
- **Next 16 async params:** `const { id } = await context.params`.
- **Race discipline (Story 1.5 review):** disable Edit/Delete while a toggle is in flight; guard the delete against re-entry; no optimistic removal.
- **Inline confirm over `window.confirm`:** testable with Playwright, accessible, and the home for Epic 3's voiced dialog copy. Scope E2E confirm/cancel locators to the row.
- **`console.error` in the INTERNAL catch** (1.4 review) — match it for the DELETE catch.
- **Test infra:** `fileParallelism:false`; integration migrate + truncate + gate on `TEST_DATABASE_URL`; E2E `webServer` needs `DATABASE_URL`, wait for loading to clear, scope row locators by unique text. Browsers via `npx playwright install`. (E2E test-DB isolation deferred to 4.1.)
- **No new dependencies** expected (HALT if you think one is needed). Git already initialized (no `git init`); Node 24.

### Latest tech information

- **Next 16 Route Handler `DELETE`**: `export async function DELETE(request, ctx: { params: Promise<{id:string}> })`; return `new Response(null, { status: 204 })` for no-content. Reuse the `PATCH` file's structure.
- No new packages. `repository.delete`, `getRepository`, `toApiError`, and `TodoApiError` already exist.

### Project Structure Notes

- `DELETE` joins `PATCH` in the existing `app/api/todos/[id]/route.ts` — completing the item route per the spine seed. No new modules.

### References

- [Source: planning-artifacts/epics.md#Story-1.6] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-4] REST contract (DELETE → 204; error envelope; 404)
- [Source: .../ARCHITECTURE-SPINE.md#AD-10] accessibility (confirm/cancel dialog stable accessible names)
- [Source: .../ARCHITECTURE-SPINE.md#AD-1/2] layering + single repository; [#AD-8] plain errors; [#AD-11] XSS-safe
- [Source: implementation-artifacts/1-2-todo-data-model-shared-zod-schema-repository.md] repository `delete()` → boolean, guards malformed id
- [Source: implementation-artifacts/1-4-edit-a-tasks-text-in-place.md] `[id]` route PATCH pattern, async params, `console.error` in catch, `encodeURIComponent`
- [Source: implementation-artifacts/1-5-toggle-completion-with-clear-status.md] race discipline (disable during in-flight), single-interaction-per-item, `todo-app.tsx` structure
- [Source: implementation-artifacts/1-3-create-and-view-tasks-with-validation.md] `lib/todos-client.ts` helpers, E2E patterns, `fileParallelism:false`
- [Source: _bmad-output/project-context.md] FR-5 confirm before delete; a11y; optimistic UI deferred to Epic 2; no hardcoded voice (Epic 3)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **204 no-content:** `DELETE` returns `new Response(null, { status: 204 })`; `deleteTodo` does not call `parseJson` (no body). Repository `delete` returns `false` for missing OR malformed id → route maps `false → 404` (integration-tested for both).
- **E2E locator collision fixed (regression caught by this story's run):** the new per-row Delete/Confirm/Cancel `aria-label`s include the task text (the Story 1.5 a11y pattern). Prior specs used regex names (`/edit/i`, `/cancel/i`) against **page-level** queries, so a task text containing "edit"/"cancel" (e.g. `"e2e edit …"`, `"e2e cancel …"`) made the `Delete: …` label match too → strict-mode violations. Hardened `edit-in-place.spec.ts` and `edit-cancel.spec.ts` to use **exact** control names (`"Edit"`, `"Save"`, `"Cancel"`). Product code was correct; only the older test locators needed tightening.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Story complete and verified. Epic 1 CRUD is now feature-complete.** All 3 ACs, 4 tasks / 16 subtasks satisfied.
- **What was built:** `DELETE /api/todos/[id]` (`204` on success, `404` for missing/malformed id, `console.error` + `INTERNAL` catch); `deleteTodo(id)` client wrapper (no-body-safe); inline delete-confirmation UI in `TodoItem` (Delete → "Delete this task?" + Confirm/Cancel with per-row accessible names; Cancel keeps, Confirm removes via `onDeleted`; in-flight guarded; no optimistic removal).
- **Verification:** typecheck ✅ · lint ✅ · **90/90 Vitest** vs real Postgres 18 (DELETE integration + `deleteTodo` unit + prior suites); **7 E2E pass** on Chromium (added delete-with-confirm: confirm-required → cancel-keeps → confirm-removes → reload-gone).
- **Scope fences honoured:** no optimistic delete (→ 2.2), no store (→ 2.1), no sort (→ 2.3), no voice (→ Epic 3); no changes to PATCH/schema/repository/collection route.

### File List

**New:**
- `tests/e2e/delete-with-confirm.spec.ts` — confirm-required + cancel-keeps + confirm-removes + reload-gone E2E

**Modified:**
- `app/api/todos/[id]/route.ts` — `DELETE` handler (204 / 404 / INTERNAL)
- `lib/todos-client.ts` — `deleteTodo(id)` wrapper
- `app/todo-app.tsx` — delete + inline-confirm UI in `TodoItem`; `onDeleted` in `TodoApp`
- `tests/integration/todos-id-route.test.ts` — DELETE tests (204/404/malformed)
- `tests/unit/todos-client.test.ts` — `deleteTodo` unit tests
- `tests/e2e/edit-in-place.spec.ts`, `tests/e2e/edit-cancel.spec.ts` — hardened to exact control-name locators (collision with the new per-row Delete label)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | Story 1.6 drafted (ready-for-dev): DELETE handler (204/404), `deleteTodo` client wrapper, inline delete-confirmation UI, delete/cancel/reload E2E. Completes Epic 1 CRUD. |
| 2026-07-06 | Story 1.6 implemented: `DELETE /api/todos/[id]` (204/404), `deleteTodo` wrapper, inline delete-confirmation UI (per-row a11y names, in-flight-guarded, no optimistic removal). Hardened two prior E2E specs to exact locators (label collision). 90/90 Vitest vs real Postgres 18; 7 E2E pass on Chromium. Status → review. |
| 2026-07-06 | Automate: +1 idempotency test (double-delete → 204 then 404); 91 Vitest. Code review (3 layers, ACs pass; Edge Hunter refuted Blind's malformed-id High): 2 patches applied (clear error on confirm-open; autoFocus Cancel), 2 deferred (fetch abort → 2.2, fuller dialog a11y → 3.4/4.2), 6 dismissed. Post-fix 91/91 Vitest + 7 E2E green. Status → done. Epic 1 CRUD complete. |
