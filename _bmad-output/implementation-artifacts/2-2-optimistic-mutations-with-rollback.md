---
baseline_commit: 21075b9a072b04efd8b6de193757bfedf96c01c9
---

# Story 2.2: Optimistic mutations with rollback

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my actions to appear instantly and recover gracefully if they fail,
so that the app always feels fast and never lies about what was saved.

## Acceptance Criteria

1. **Given** any mutation (create/edit/toggle/delete), **when** I perform it, **then** the UI updates optimistically within ≤100 ms, then reconciles with the server.
2. **And** on failure it rolls back **per operation** and shows a retryable error (FR-10):
   - **edit** restores the prior text but keeps my typed value available to retry;
   - **delete** reinserts the task at its original position;
   - **toggle** snaps back to the prior completion state;
   - **create** removes the optimistic row but keeps the entered text.
3. **And** a task with no server `id` (an unconfirmed optimistic create) cannot be edited/toggled/deleted until its create resolves (FR-11).

## Tasks / Subtasks

- [x] **Task 1 — Optimistic entry model + reducer (extend the store)** (AC: #1, #2, #3)
  - [x] In `lib/store/todo-store.tsx`, extend the collection to hold **entries** that are either a saved `Todo` (has a server `id`) or a **pending create** (`{ tempId, text, completed: false, pending: true }` — a `tempId` NEVER occupies the `id` field, AD-7). Add a type guard (e.g. `isPending(entry)`).
  - [x] Extend the **pure reducer** with optimistic actions (unit-tested):
    - `create/optimistic { tempId, text }` → append a pending entry
    - `create/commit { tempId, todo }` → replace the pending entry with the saved `Todo` (reconcile — server `id` is authoritative)
    - `create/rollback { tempId }` → remove the pending entry
    - `update/optimistic { id, patch }` → apply `{text?, completed?}` to the saved entry in place
    - `update/commit { id, todo }` → set the server-returned `Todo`
    - `update/rollback { id, prev }` → restore the prior `Todo`
    - `delete/optimistic { id }` → remove the entry
    - `delete/rollback { todo, index }` → reinsert `todo` at `index`
  - [x] Keep the reducer pure/side-effect-free and a no-op when not `ready`. Preserve the Story 2.1 load actions + the generation-token load guard.
- [x] **Task 2 — Store mutation orchestration (optimistic-apply → reconcile → rollback)** (AC: #1, #2, #3)
  - [x] `create(input)`: generate a client `tempId` (`crypto.randomUUID()`), dispatch `create/optimistic`, then `await createTodo(input)`; on success `create/commit`, on failure `create/rollback` and **rethrow** so the form keeps the entered text + shows a retryable error.
  - [x] `update(id, input)`: snapshot the current saved todo (`prev`) from state, dispatch `update/optimistic`, `await updateTodo`; success `update/commit`, failure `update/rollback { id, prev }` + rethrow.
  - [x] `remove(id)`: snapshot the todo + its index, dispatch `delete/optimistic`, `await deleteTodo`; success = nothing more (already removed), failure `delete/rollback { todo, index }` + rethrow.
  - [x] **FR-11 guard:** `update`/`remove` must reject/ignore a `tempId` (an entry without a server `id`) — a pending task is non-mutable until its create resolves. (The UI also disables its controls — Task 3 — but the store guards defensively.)
  - [x] Keep the Story 2.1 hardening: mounted-guard every dispatch; the load generation token stays.
- [x] **Task 3 — Client fetch timeout / abort (the carried deferral)** (AC: #1, #2)
  - [x] Add a request timeout to the `lib/todos-client` wrappers via `AbortSignal.timeout(ms)` (a sensible default, e.g. 10s) so a hung request rejects instead of leaving a mutation pending forever. A timeout becomes a normal failure → triggers the per-op rollback + retryable error. (Resolves the Story 1.4/2.1 "no client fetch timeout/AbortController" defer.)
- [x] **Task 4 — UI: optimistic feel, per-op retry, pending non-mutable** (AC: #1, #2, #3)
  - [x] `app/todo-app.tsx` renders pending entries (keyed by `tempId`): show the text with a subtle "saving…"/pending affordance and **disable its Edit / checkbox / Delete controls** until it reconciles (FR-11). Saved entries behave as before.
  - [x] Because mutations are now optimistic, the item controls no longer need to block on in-flight requests the same way — the change is instant. On **failure**, the store has already rolled back; the component surfaces a **retryable** error and preserves the value so the user can retry: create → keep the add-input text; **edit → stay in edit mode with the typed draft**; toggle/delete → error shown, action re-performable.
  - [x] Preserve ALL Epic 1/2.1 accessible names/roles/text and the single-editor + delete-confirm behaviour (the whole existing E2E suite must stay green).
- [x] **Task 5 — Tests** (AC: #1, #2, #3)
  - [x] **UPDATE** `tests/unit/todo-store.test.ts` — reducer optimistic-apply + rollback per op: `create/optimistic`→`commit` (tempId replaced by server id) and `create/optimistic`→`rollback` (removed); `update/optimistic`→`rollback` restores prior; `delete/optimistic`→`rollback` reinserts at original index; and (via the type guard) a pending entry is identified as non-mutable. No DB/DOM.
  - [x] **NEW** `tests/e2e/optimistic.spec.ts` — Playwright with mutation interception: (a) force `POST /api/todos` to `500` → the new task **appears immediately then disappears** (rollback) and a retryable error shows with the text retained; (b) force `PATCH` to `500` on a toggle → the checkbox flips then **snaps back**; plus a delete-rollback reinsert and an optimistic-then-reconcile happy path. Deterministic via `page.route`.
  - [x] Typecheck + lint clean; **full Vitest suite green** with `TEST_DATABASE_URL`; **all existing E2E still pass** (create/edit/toggle/delete/validation/states) — behaviour must be preserved (now instant). Keep `fileParallelism:false`.

## Dev Notes

### What this story adds (AD-7 optimistic + rollback, on the 2.1 store)

Story 2.1 built the single store as the **non-optimistic baseline** (await → apply). Story 2.2 wraps each mutation with **optimistic apply → reconcile → rollback**, plus the `tempId` model for creates (FR-11) and the client timeout. All of it lives in the one store (AD-14) + the shared client wrappers — no API/route/schema changes.

- **Current baseline (2.1):** the store's `create`/`update`/`remove` await the server then dispatch `append`/`upsert`/`remove`. The reducer is pure; `TodoStoreProvider` owns state with a load generation token + mounted-guarded dispatches; `useTodoStore()` is the single consumer hook. `todo-app.tsx` consumes it and renders loading/error/empty/list.
- **After 2.2:** mutations apply to state **immediately** (optimistic), then the server response either commits (reconcile) or rolls back per FR-10. Creates use a `tempId` and a pending entry until the server `id` arrives; pending entries are non-mutable (FR-11).

### The AD-7 rules (implement exactly)

- Optimistic update visible in **≤100 ms** (synchronous dispatch satisfies this); reconcile with the server (≤500 ms p95 is verified later in Story 4.3 — not asserted here).
- **Pending create:** client assigns a `tempId`; the server-generated `id` is authoritative and replaces the `tempId` on success; **a `tempId` never occupies the `id` field**. A task without a server `id` is non-mutable (edit/toggle/delete disabled) until create resolves (FR-11).
- **Per-op rollback (FR-10):** edit → restore prior text (keep typed value to retry); delete → reinsert at original position; toggle → snap back; create → remove optimistic row (keep entered text). Every failure surfaces a **retryable** error (plain now; voiced in Epic 3).

### Scope fences (do NOT build here)

- **Sort order** (FR-8) → **Story 2.3**. **Responsive** (FR-13) → 2.4. **Voice pack** (voiced errors) → Epic 3 — errors are plain now. **Perf budget verification** (≤100 ms / ≤500 ms p95) → Story 4.3 (this story makes it optimistic; 4.3 measures it).
- No API/route/schema/repository changes; consume `lib/todos-client` (adding the timeout is the only wrapper change).

### Architecture compliance (guardrails)

- **AD-7:** optimistic + rollback state paradigm; `tempId` client-side, server `id` authoritative, reconcile on create; per-op rollback + retryable error.
- **AD-14:** all of this stays in the single store; components consume it. **AD-1/AD-2:** store → client wrapper → API; never `lib/db`. **AD-11:** text via React escaping. **AD-8:** plain error copy. **FR-11:** pending tasks non-mutable.
- **Keep the 2.1 review hardening:** load generation token; mounted-guarded dispatches.

### Files this story touches

- **UPDATE:** `lib/store/todo-store.tsx` (entry model + optimistic reducer actions + orchestration + FR-11 guard), `lib/todos-client.ts` (AbortSignal timeout), `app/todo-app.tsx` (render pending entries, disable their controls, per-op retry/error), `tests/unit/todo-store.test.ts` (optimistic/rollback reducer cases)
- **NEW:** `tests/e2e/optimistic.spec.ts` (forced-failure rollback + retry via interception)
- **PRESERVE (no regression):** the API, repository, schema, and the entire existing Vitest + E2E suite (create/edit/toggle/delete/validation/states) — now instant, same observable outcomes.

### Learnings carried from Epic 1 + 2.1 (apply them)

- **Extend the pure reducer** for the optimistic actions so the core logic stays unit-testable without a DOM harness (the exact pattern that made 2.1 testable).
- **Keep the load generation token + mounted-guarded dispatches** (2.1 review) — don't regress them; add the same discipline to the new optimistic dispatches.
- **`crypto.randomUUID()`** is available in the browser + Node 24 for `tempId`. Ensure a `tempId` is never sent to the server and never rendered into the `id` field.
- **E2E via `page.route`** to force mutation failures deterministically (Epic 1/2.1 pattern); scope locators by role + exact/row (recall the per-row `aria-label` collision lesson — task text can contain control words). Wait for loading to clear before interacting.
- **Reducer no-ops when not `ready`** (2.1) — the deferred "mutation resolving while not ready" concern is naturally handled by optimistic dispatches only being issued from a ready list; the commit/rollback actions should also no-op safely if the entry is gone.
- **Test infra:** `fileParallelism:false`; integration migrate + truncate + gate on `TEST_DATABASE_URL`; E2E `webServer` needs `DATABASE_URL`. **No new dependencies** (hand-rolled). Git initialized; Node 24.

### Latest tech information

- **`AbortSignal.timeout(ms)`** (browser + Node ≥17.3 / Node 24) — pass `{ signal: AbortSignal.timeout(10_000) }` to `fetch` in the wrappers; a timeout rejects with an `AbortError`/`TimeoutError` that the store treats as a normal failure → rollback.
- **React 19 `useReducer`** — dispatch the optimistic action, then the async commit/rollback; no new libs. (React's `useOptimistic` exists but the project uses the hand-rolled reducer store per AD-14 — do NOT introduce `useOptimistic`/new deps; extend the existing reducer.)

### Project Structure Notes

- All changes are within the existing `lib/store`, `lib/todos-client`, `app/todo-app.tsx`, and tests. No new modules/routes.

### References

- [Source: planning-artifacts/epics.md#Story-2.2] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-7] optimistic mutation + rollback; tempId; server id authoritative; reconcile on create; ≤100 ms / ≤500 ms p95
- [Source: .../ARCHITECTURE-SPINE.md#AD-14] single store owns optimistic state; [#AD-1/2] layering; [#AD-8] plain errors; [#AD-11] XSS-safe
- [Source: epics.md#FR-10] per-op rollback rules; [#FR-11] no mutation on a task without a server id
- [Source: implementation-artifacts/2-1-single-client-side-todo-store-with-empty-loading-error-states.md] the store baseline (reducer + provider + hook), load generation token, mounted-guarded dispatches, single-editor derivation
- [Source: implementation-artifacts/1-4…1-6] the mutation UIs (edit/toggle/delete) + accessible names to preserve; delete-confirm
- [Source: implementation-artifacts/deferred-work.md] client fetch timeout/AbortController (this story); reconcile-after-mutation (this story's optimistic model addresses it)
- [Source: _bmad-output/project-context.md] optimistic UI required (instant feel, roll back on failure, voiced error → plain for now); AD-14 single owner; no new deps

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `npx vitest run` (unit only) — 67 passed, 45 skipped (integration self-skips without a DB).
- `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npx vitest run` — **112 passed** (unit + integration).
- `npx playwright test` (chromium + mobile) — **28 passed, 2 skipped** (smoke placeholders); new `optimistic.spec.ts` 4 tests green on both projects.

### Completion Notes List

- **Optimistic entry model (AD-7).** The ready state now holds `entries: TodoEntry[]` where an entry is either a saved `Todo` (server `id`) or a `PendingTodo` (`{ tempId, text, completed:false, pending:true }`). `isPending()` type guard added; a `tempId` never occupies the `id` field. Server `id` is authoritative and replaces the `tempId` on `create/commit`.
- **Pure reducer** extended with the 8 optimistic actions; all mutation actions no-op unless `ready`. The 2.1 `append`/`upsert`/`remove` actions were replaced by these (their old unit tests were rewritten). Load actions + generation-token load guard preserved.
- **Store orchestration**: optimistic-apply (synchronous dispatch → ≤100 ms visible) → `await` client wrapper → commit (reconcile) | rollback + rethrow. `findSaved(id)` snapshots `{todo,index}` for rollback and **enforces FR-11** (rejects a `tempId`/missing entry — pending tasks are non-mutable). Every post-await dispatch is mounted-guarded.
- **Design decision — store-level mutation-error channel.** Optimistic delete unmounts the originating row, so a failed delete can't surface an error from the (gone) `TodoItem`. Added `mutationError` / `dismissMutationError` to the store (a provider `useState`, kept out of the reducer so it survives row removal and never changes list status). All create/edit/toggle/delete server failures render one retryable banner in `TodoView`; inline errors are now client-side **validation** only. This is a deliberate refinement of the story's "per-item retry" wording — the retry affordance is preserved (values retained: add-input text, edit stays open with draft, toggle/delete re-performable), just surfaced consistently.
- **Client timeout (carried deferral resolved).** `lib/todos-client.ts` wraps every `fetch` in `request()` with `AbortSignal.timeout(10_000)`; a timeout/network failure becomes a `TodoApiError` ("The request timed out."/"Network error.") → normal failure → per-op rollback.
- **Pending UI (FR-11).** `PendingRow` renders the text + a "Saving…" affordance and a disabled checkbox, with **no** edit/toggle/delete controls until the create reconciles. Playwright's actionability auto-wait bridges the pending→saved transition for the existing edit/toggle/delete specs (verified: all still green).
- **No new dependencies; no API/route/schema/repository changes.** `useOptimistic` intentionally not introduced (AD-14 hand-rolled store).

### File List

- `lib/store/todo-store.tsx` — UPDATE (optimistic entry model, 8 reducer actions, orchestration + FR-11 guard, mutationError channel)
- `lib/todos-client.ts` — UPDATE (`request()` wrapper with `AbortSignal.timeout`)
- `app/todo-app.tsx` — UPDATE (render `entries`, `PendingRow`, store mutation-error banner, validation-only inline errors)
- `tests/unit/todo-store.test.ts` — UPDATE (optimistic/rollback reducer cases replacing append/upsert/remove)
- `tests/unit/todos-client.test.ts` — UPDATE (bmad-tea: `request()` timeout/network → `TodoApiError` mapping; abort signal attached)
- `tests/e2e/optimistic.spec.ts` — NEW (optimistic-then-reconcile + create/edit/toggle/delete rollback via `page.route`)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-07 | Story 2.2 drafted (ready-for-dev): optimistic create/edit/toggle/delete with per-op rollback + retry on the 2.1 store; tempId pending model + FR-11 non-mutable pending; client AbortSignal timeout; reducer optimistic unit tests + forced-failure rollback E2E. |
| 2026-07-07 | Story 2.2 implemented (review): optimistic entry model + 8 reducer actions + store orchestration with FR-11 guard; store-level retryable mutation-error banner (survives optimistic delete); `AbortSignal.timeout` client wrapper; `PendingRow`; unit tests rewritten (33 store/client cases) + new `optimistic.spec.ts`. Typecheck/lint clean; 112 Vitest passed; 28 E2E passed. |
| 2026-07-07 | bmad-tea automate: +3 client-wrapper unit tests (timeout/network → TodoApiError; abort signal attached) + 1 E2E (edit rollback keeps draft, Cancel restores prior text). 115 Vitest passed; 30 E2E passed. |
| 2026-07-07 | Code review (adversarial 3-layer): 3 patches applied — edit made visibly optimistic (close-then-reopen-on-failure); `delete/rollback` hardened with an order-snapshot (robust to interleaved deletes); toggle/delete/edit E2E strengthened to prove the optimistic apply. 1 defer (timeout-after-success false rollback → deferred-work). 4 dismissed. 117 Vitest passed; 32 E2E passed. Status → done. |

### Review Findings (2026-07-07, adversarial 3-layer)

Patch (all applied 2026-07-07):

- [x] [Review][Patch] Edit is not visibly optimistic on the happy path (AC #1) — FIXED: `save()` now closes the editor immediately (list shows the new text via the store's optimistic dispatch); on failure it reopens with the retained draft. Row controls disabled during reconcile to prevent same-row clobber. [app/todo-app.tsx save()]
- [x] [Review][Patch] `delete/rollback` reinserts by a stale absolute index → order corruption — FIXED: rollback now carries an `order: string[]` key snapshot and restores that ordering (stable-sort), robust to interleaved deletes/creates. [lib/store/todo-store.tsx delete/rollback + remove]
- [x] [Review][Patch] Toggle/delete rollback E2E don't prove the optimistic apply happened — FIXED: toggle/delete tests now hold the response to assert the optimistic flip/removal is visible pre-commit; added an "edit is applied optimistically before the server confirms" test. [tests/e2e/optimistic.spec.ts]

Defer:

- [x] [Review][Defer] Timeout/abort after a server-side success → false rollback (+ duplicate on create-retry); GET load path now bounded at 10s [lib/todos-client.ts] — deferred: inherent optimistic tradeoff, needs idempotency/reconcile (out of scope, no API changes)

Dismissed (4): toggle+edit same-row clobber (false positive — Edit disabled while toggling); banner cleared by next op (intended UX); store-level mutation banner (acceptable per ACs); no explicit Retry button (re-perform satisfies retryable).
