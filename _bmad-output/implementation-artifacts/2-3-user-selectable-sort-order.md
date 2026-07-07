---
baseline_commit: 0f678a0b74de7b8b2dea6e9774358dd75ee1d924
---

# Story 2.3: User-selectable sort order

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to sort my list,
so that I can view tasks in the order that suits me.

## Acceptance Criteria

1. **Given** a list of tasks, **when** I choose a sort option, **then** the store re-orders the visible list by one of: **newest-first (default)**, **oldest-first**, **alphabetical**, or **active-before-completed** (FR-8).
2. **And** the current sort selection is **always clearly indicated** in the UI.
3. **And** sort is **client-owned and purely presentational**: the API still returns creation-order, the store's canonical `entries` order is unchanged, and switching sort performs **no** network request and does not affect create/edit/toggle/delete or their optimistic rollback behaviour.

## Tasks / Subtasks

- [x] **Task 1 — Sort model + pure comparators (new `lib/store/sort.ts`)** (AC: #1, #3)
  - [x] Define `export type SortOrder = "newest" | "oldest" | "alphabetical" | "active-first"` and `export const DEFAULT_SORT: SortOrder = "newest"`.
  - [x] Define `export const SORT_OPTIONS: ReadonlyArray<{ value: SortOrder; label: string }>` (plain labels — AD-8; voice is Epic 3): `Newest first`, `Oldest first`, `Alphabetical`, `Active first`.
  - [x] Implement `export function sortEntries(entries: TodoEntry[], order: SortOrder): TodoEntry[]` — **pure, non-mutating** (returns a `[...entries]` copy). Operates on `TodoEntry` (saved `Todo` or `PendingTodo`).
    - Time key: saved → `Date.parse(createdAt)`; **pending → `Number.POSITIVE_INFINITY`** (newest). `cmpNewest` guards `Infinity − Infinity` (NaN) → 0 so multiple pending keep canonical order.
    - `newest`: desc. `oldest`: `-cmpNewest`.
    - `alphabetical`: `localeCompare(b, undefined, { sensitivity: "base" })`, tiebreak newest.
    - `active-first`: `Number(completed)` asc (active first), tiebreak newest.
    - Total + stable ordering via explicit tiebreak.
  - [x] Does not mutate/re-key `entries`; canonical order + `tempId`/`id` model owned by the reducer.
- [x] **Task 2 — Store owns the sort selection + derived view** (AC: #1, #2, #3)
  - [x] Added `sortOrder` state to `TodoStoreProvider` (`useState<SortOrder>(DEFAULT_SORT)`, presentational — outside the reducer).
  - [x] Exposed on `TodoStore`: `sortOrder`, `setSortOrder`, and derived `sortedEntries` = `state.status === "ready" ? sortEntries(state.entries, sortOrder) : []`.
  - [x] `state.entries` stays canonical; `isEmpty`, `findSaved`, delete/rollback order-snapshot, and every optimistic path still read it — sort doesn't touch them.
  - [x] Preserved all 2.1/2.2 hardening (load generation token, mounted-guarded dispatches, FR-11 guard, mutation-error banner).
- [x] **Task 3 — Sort control UI (clearly indicated selection)** (AC: #1, #2)
  - [x] `TodoView` renders `<select aria-label="Sort tasks">` from `SORT_OPTIONS`, `value={store.sortOrder}`, `onChange` → `store.setSortOrder(...)` — the value is the clear indication (AC #2).
  - [x] List rendered from `store.sortedEntries` (pending via `isPending` → `PendingRow`, saved → `TodoItem`); `editingId` derivation + accessible names/roles unchanged.
  - [x] Control rendered only in the ready-with-items branch (keeps loading/error/empty branches + their E2E green).
  - [x] Plain markup; no responsive work (Story 2.4).
- [x] **Task 4 — Tests** (AC: #1, #2, #3)
  - [x] **NEW** `tests/unit/todo-sort.test.ts` — each option; pending placement (top/bottom/active group + alphabetical); case-insensitive alphabetical + tiebreak; active grouping + tiebreak; non-mutation; empty; stable equal-keys. (14 tests incl. +1 from automate)
  - [x] **NEW** `tests/e2e/sort.spec.ts` — seeded via GET interception; default newest, then switch each option and assert visible `li` order + the select value; plus sort-composes-with-optimistic-create. (5 tests × 2 projects incl. +1 from automate)
  - [x] Typecheck + lint clean; full Vitest green with `TEST_DATABASE_URL` (130); all existing E2E still pass (40). `fileParallelism:false` kept.

## Dev Notes

### What this story adds (FR-8 client-owned sort, on the 2.1/2.2 store)

The list is re-orderable by four options; the selection lives in the store (AD-14) and the **displayed** order is a pure function of the canonical entries + the selected sort. The server keeps returning creation-order (`repository.list()` → `created_at asc, id asc`), and the reducer's `entries` stay in that canonical order. **Sort is a derived view only** — this is what keeps Story 2.2's optimistic reconcile + rollback (which reason over canonical order and an order-snapshot) completely intact.

- **Current baseline (2.1 + 2.2, committed `0f678a0`):** `TodoStoreProvider` owns `state` (reducer: loading/ready/error, `entries: TodoEntry[]` = saved `Todo` | `PendingTodo`) + `mutationError` (useState). It exposes `{ state, isEmpty, mutationError, dismissMutationError, retry, create, update, remove }`. `app/todo-app.tsx` consumes it: loading/error/empty/list branches; the list maps `state.entries` (`isPending` → `PendingRow`, else `TodoItem`).
- **After 2.3:** add `sortOrder` (useState, default `newest`) + `setSortOrder` + derived `sortedEntries`; the list branch maps `store.sortedEntries`; a `<select aria-label="Sort tasks">` drives `setSortOrder`.

### Design rules (implement exactly)

- **Presentational, non-mutating:** `sortEntries` returns a NEW array and never mutates `entries`. The canonical `state.entries` order is sacred (rollback/reconcile depend on it). Do NOT add a reducer action for sort or reorder `entries` in the reducer.
- **Pending entries (optimistic creates) have no `createdAt`/`id` timestamp** → treat as newest for time-based sorts; they carry `text` (alphabetical) and `completed:false` (active group). They reconcile within ms, but the comparators must not throw on the missing fields.
- **Total + stable order:** always provide a deterministic tiebreak; rely on stable `Array.prototype.sort`. Two tasks with identical text (alphabetical) or identical completion (active-first) must not reorder unpredictably.
- **Plain labels (AD-8):** `SORT_OPTIONS` labels are plain English now; the Torgue voice is Epic 3 and will theme these later — keep them as data so a voice pass can remap them.

### Scope fences (do NOT build here)

- **Responsive layout** (FR-13) → **Story 2.4**. **Voice pack / themed sort labels** → **Epic 3**. **Perf verification** → Story 4.3.
- **No sort persistence across reload required** — the selection is in-memory/session (resets to `newest` on reload). Persisting to `localStorage` is out of scope; do not add it (avoid an SSR/hydration mismatch and a new concern the AC doesn't ask for).
- **No API / route / schema / repository changes.** The server intentionally returns creation-order; sorting is 100% client-side. **No new dependencies.**

### Architecture compliance (guardrails)

- **AD-14:** the store owns the sort selection + derived order; components consume it. **AD-1/AD-2:** store → client wrapper → API; the client never calls `lib/db`. **AD-7:** untouched — sort must not alter optimistic apply/reconcile/rollback (all reason over canonical `state.entries`). **AD-11:** task text stays escaped via React children. **AD-8:** plain sort labels.
- **FR-8:** exactly the four options (newest default, oldest, alphabetical, active-before-completed).

### Learnings carried from Epic 1 + 2.1 + 2.2 (apply them)

- **Put the sort logic in a pure module** (`lib/store/sort.ts`) so it is unit-testable without a DOM harness — the same pattern that made the reducer testable. Export the comparators/`sortEntries`.
- **Keep presentational state out of the reducer** (2.2's `mutationError` precedent) — `sortOrder` is a provider `useState`, so the load/optimistic state machine is unaffected.
- **E2E via `page.route` GET interception** to seed a deterministic list (Epic 1/2.1/2.2 pattern). Scope locators by role + `exact:true`; recall the per-row `aria-label` collision lesson (task text can contain control words). Assert visible `li` order with `page.locator("li")` `nth`/`allInnerTexts`.
- **Do not regress accessible names** (`New task`, `Add task`, `Completed: …`, `Edit`, `Delete: …`, `Confirm delete: …`, `Edit task`, `Save`, `Cancel`, the error/`Retry`/`Dismiss` controls) — the whole existing suite must stay green. The new control's name is `Sort tasks`.
- **Test infra:** `fileParallelism:false`; integration migrate + truncate + gate on `TEST_DATABASE_URL` (run with `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test`); E2E `webServer` reuses the running dev server. No new deps; Node 24.

### Latest tech information

- **`Array.prototype.sort` is stable** (ECMAScript 2019+; Node 24 / all target browsers) — safe to rely on for tiebreak stability, but still provide an explicit deterministic comparator (don't depend on stability for correctness of the *primary* key).
- **`String.prototype.localeCompare(other, undefined, { sensitivity: "base" })`** gives case- and accent-insensitive alphabetical ordering without a new dependency.
- **React 19 controlled `<select>`** — `value={store.sortOrder}` + `onChange`; no new libs. Do not reach for a headless select/combobox dependency (AD: no new deps).

### Project Structure Notes

- **NEW:** `lib/store/sort.ts` (SortOrder, DEFAULT_SORT, SORT_OPTIONS, `sortEntries`), `tests/unit/todo-sort.test.ts`, `tests/e2e/sort.spec.ts`.
- **UPDATE:** `lib/store/todo-store.tsx` (sortOrder state + setSortOrder + sortedEntries), `app/todo-app.tsx` (sort `<select>` + render `sortedEntries`), possibly `lib/store/index.ts` (already `export *` — the new `sort.ts` symbols can be re-exported from the store or imported directly).
- **PRESERVE (no regression):** the API, repository, schema, reducer/optimistic paths, and the entire existing Vitest + E2E suite.

### References

- [Source: planning-artifacts/epics.md#Story-2.3] user story + ACs + tests (unit comparators; E2E switching reorders)
- [Source: planning-artifacts/epics.md#FR-8] newest-first (default), oldest-first, alphabetical, active-before-completed
- [Source: planning-artifacts/architecture/*ARCHITECTURE-SPINE*.md#AD-14] single client-side owner of the collection **including sort order**; [#AD-7] optimistic/rollback must stay intact; [#AD-1/2] layering; [#AD-8] plain copy; [#AD-11] XSS-safe
- [Source: implementation-artifacts/2-2-optimistic-mutations-with-rollback.md] the store surface (entries model, mutationError precedent for presentational state, canonical order + delete/rollback order-snapshot that sort must not disturb)
- [Source: lib/db/repository.ts#list] API returns creation-order (`created_at asc, id asc`) — sort is therefore client-side
- [Source: _bmad-output/project-context.md] user-selectable sort; AD-14 single owner; no new deps

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run typecheck` — clean.
- `npm run lint` — clean.
- `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npx vitest run` — **131 passed** (was 117; +14 sort unit — 13 from dev-story, +1 from bmad-tea automate).
- `npx playwright test` — **42 passed, 2 skipped** (was 32; +10 sort E2E across chromium + mobile — 5 specs × 2 projects, incl. the automate-added sort+optimistic test).

### Completion Notes List

- **Client-owned, purely-presentational sort (FR-8).** New `lib/store/sort.ts` holds the `SortOrder` type, `DEFAULT_SORT` (`newest`), `SORT_OPTIONS`, and a pure non-mutating `sortEntries(entries, order)`. The store keeps `state.entries` canonical (creation-order + appended pending); the displayed order is a derived `store.sortedEntries` computed from the canonical list + the selected order. Switching sort issues no network request.
- **Optimistic paths untouched.** Because sort never mutates `entries`, Story 2.2's reconcile, delete/rollback order-snapshot, `findSaved`, and `isEmpty` all keep reading canonical order — verified by the full optimistic + core E2E suites staying green.
- **Pending (optimistic-create) handling.** `sortEntries` treats a pending entry's time key as `+Infinity` (newest), and `cmpNewest` guards `Infinity − Infinity` → 0 so multiple pending entries keep their canonical order (stable). Pending is `completed:false` so it lands in the active group for `active-first`.
- **Sort selection is presentational state** (`useState` in the provider, like `mutationError`) — deliberately outside the reducer so the load/optimistic state machine is unaffected. Not persisted across reload (resets to `newest`) — the AC only requires the current selection be clearly indicated; persistence was fenced out of scope.
- **UI:** accessible `<select aria-label="Sort tasks">` in the ready-with-items branch; `value` reflects the current selection (AC #2). All Epic 1/2 accessible names/roles preserved.
- **No API/route/schema/repository changes; no new dependencies.**

### File List

- `lib/store/sort.ts` — NEW (SortOrder, DEFAULT_SORT, SORT_OPTIONS, pure `sortEntries`)
- `lib/store/todo-store.tsx` — UPDATE (sortOrder state + setSortOrder + derived sortedEntries)
- `lib/store/index.ts` — UPDATE (re-export `./sort`)
- `app/todo-app.tsx` — UPDATE (sort `<select>` + render `sortedEntries`)
- `tests/unit/todo-sort.test.ts` — NEW (comparator unit tests)
- `tests/e2e/sort.spec.ts` — NEW (switching sort reorders the visible list)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-07 | Story 2.3 drafted (ready-for-dev): client-owned, purely-presentational sort with four comparators (newest default/oldest/alphabetical/active-first) in a pure `lib/store/sort.ts`; store owns `sortOrder` + derived `sortedEntries` (canonical `entries` untouched → optimistic reconcile/rollback intact); accessible `<select>` control; unit comparator tests + E2E reorder test. |
| 2026-07-07 | Story 2.3 implemented (review): pure `lib/store/sort.ts` (4 comparators, pending-as-newest, stable tiebreaks); store `sortOrder`/`setSortOrder`/derived `sortedEntries`; `<select aria-label="Sort tasks">`; canonical entries + optimistic paths untouched. 13 unit + 8 E2E. Typecheck/lint clean; 130 Vitest, 40 E2E. |
| 2026-07-07 | bmad-tea automate: +1 unit (alphabetical + pending placement) +1 E2E (new task sorted to top under newest, not just appended — proves sort composes with optimistic create). 131 Vitest, 42 E2E. |
| 2026-07-07 | Code review (adversarial 3-layer): very clean (Edge Hunter + Auditor found no true issues). 3 patches applied — "oldest" test fixtures made non-identity, `localeCompare` pinned to "en", story doc counts corrected. 0 deferred, 2 dismissed. 131 Vitest, 42 E2E. Status → done. |

### Review Findings (2026-07-07, adversarial 3-layer)

Very clean review — Edge Case Hunter found no issues; Acceptance Auditor found no true AC violations.

Patch (all applied 2026-07-07):

- [x] [Review][Patch] "oldest" tests can't distinguish a correct sort from a no-op — FIXED: unit "oldest" now feeds a non-ascending input `[C,A,B]`; the E2E `seeded` array is reordered to `[banana,cherry,apple]` so canonical order differs from every sort result (each assertion now fails on an identity/no-op sort). [tests/unit/todo-sort.test.ts, tests/e2e/sort.spec.ts]
- [x] [Review][Patch] `localeCompare` uses the host default locale — FIXED: pinned to `"en"` for cross-environment determinism. [lib/store/sort.ts]
- [x] [Review][Patch] Story doc test counts stale — FIXED: Debug Log/Task 4 updated to 14 unit / 10 E2E (131 Vitest, 42 E2E). [2-3 story doc]

Dismissed (2): `sensitivity:"base"` is accent+case-insensitive (acceptable alphabetical UX); non-transitive comparator on an unparseable `createdAt` (unreachable — `createdAt` is schema-constrained to ISO via `z.iso.datetime()`; the NaN→0 guard prevents any sort crash).
