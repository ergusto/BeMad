# Deferred Work

## Deferred from: code review of story-1.2 (2026-07-06)

- **CRUD integration tests skip silently without `TEST_DATABASE_URL`** — a CI/local run without the test DB reports green while the data layer is unexercised. Systemic fix: Story 4.2's ≥70% coverage gate fails if these are skipped, and CI must provide the `test`-profile Postgres. Revisit when CI is set up. [tests/integration/repository.test.ts]
- **`healthcheck()` timeout does not cancel the in-flight query** — on timeout it rejects but the query keeps holding one of the pool's 5 connections until the DB answers; sustained partial outage could pin the pool. Pre-existing Story 1.1 code; postgres.js has no simple per-query cancel. Options if it manifests: dedicated health connection, or lower/again-bounded pool. [lib/db/repository.ts healthcheck]

## Deferred from: code review of story-1.3 (2026-07-06)

- **E2E test-DB isolation & cleanup** — `playwright.config.ts` `webServer` runs `npm run dev` against ambient `DATABASE_URL` with no isolation; `create-view.spec.ts` persists a durable row per run. Risks polluting a real DB and cross-run accumulation / `fullyParallel` cross-test interference. Fix in Story 4.1 when the full ≥5-test E2E suite is assembled: wire the `test` compose profile as the E2E DB and add truncation/cleanup (global setup or per-spec). [playwright.config.ts, tests/e2e/*]

## Deferred from: code review of story-1.4 (2026-07-06)

- ~~**No client-side fetch timeout / AbortController**~~ — **RESOLVED in Story 2.2.** `lib/todos-client.ts` now wraps every request in `request()` with `AbortSignal.timeout(10_000)`; a timeout/network failure becomes a `TodoApiError` → normal failure → per-op optimistic rollback. [lib/todos-client.ts]

## Deferred from: code review of story-1.5 (2026-07-06)

- **Toggle-failure UI test** — the toggle error path (surface error, leave checkbox at true server state) is implemented and confirmed correct by review, but has no automated test; a component-level test needs a harness (React Testing Library, a new dependency). Add when a component-test harness is introduced, or cover via a fault-injection E2E in Story 4.1. [app/todo-app.tsx]

## Deferred from: code review of story-1.6 (2026-07-06)

- **Fuller confirm-dialog accessibility** — the delete confirmation now moves focus to Cancel on open (safe default), but focus RETURN to the trigger on cancel and an `aria-live` announcement of the prompt are deferred to Story 3.4 (accessibility) / the Story 4.2 axe audit. [app/todo-app.tsx]
- (Client fetch timeout/AbortController for hung mutations — already tracked under the Story 1.4 defer for Story 2.2.)

## Deferred from: code review of story-2.1 (2026-07-06)

- **Reconcile-after-mutation when the collection is not `ready`** — a mutation that succeeds server-side while the store is not in `ready` state (e.g. a future reload/sort-refresh path in Story 2.3, or dev StrictMode remount) is no-op'd by the reducer and silently dropped from the UI until the next load. Currently unreachable in production. Story 2.2 narrowed the window (optimistic dispatches only fire from a `ready` list, and commit/rollback no-op safely if the entry is gone), but a mutation resolving *across* a load→not-ready transition is still dropped. Revisit with Story 2.3's sort-refresh path. [lib/store/todo-store.tsx]

## Deferred from: code review of story-2.2 (2026-07-07)

- **Timeout/abort after a server-side success causes a false rollback** — every request is now bounded by `AbortSignal.timeout(10_000)` (`lib/todos-client.ts`). If the server commits a create/update/delete but the response is slow (or the connection drops) past the timeout, the client treats the abort as an ordinary failure and rolls back state the server actually kept. Worst case: a create times out → optimistic row removed + text retained → the user's natural retry issues a second POST → **duplicate todo** on next reload. Toggle/edit/delete diverge silently from the server until reload. Inherent optimistic + timeout tradeoff; a proper fix needs request idempotency keys and/or a reconcile-on-reload — both out of Story 2.2 scope (no API/route/schema changes allowed). Also note the timeout now bounds the GET/load path: a legitimately slow (>10s) initial load becomes an error state (with Retry) where it previously waited indefinitely — judged acceptable (better than an infinite spinner). Revisit alongside a future reconciliation/idempotency story. [lib/todos-client.ts, lib/store/todo-store.tsx]

## Deferred from: code review of story-3.1 (2026-07-08)

- **Sort control labels have no voice key (FR-14 gap to close in Story 3.3)** — the `Sort tasks` label and the four sort-option labels (`Newest first`, `Oldest first`, `Alphabetical`, `Active first`) from `lib/store/sort.ts` are user-facing and rendered today (Story 2.3), but the Story 3.1 voice catalog has no key for them. They were deliberately excluded because they convey the **current selection**, and FR-17 forbids rotating selection-conveying text — so they don't fit the catalog's ≥5-rotating-variant shape. Story 3.3 must decide how to voice **non-rotating** copy (e.g. a single-variant/fixed voiced label per option, or a separate "fixed copy" map exempt from the ≥5 rule) and source these from the voice pack rather than hardcoding them (FR-14). [lib/voice/catalog.ts, lib/store/sort.ts, app/todo-app.tsx]
- **Story 3.3 finalization flags (from the 3.1 review, not blocking):** (a) a few confirm-label variants read tersely out of context (`deleteConfirmButton`: "Do it", "No mercy", "Gone forever") — ensure they remain unambiguous as rotating accessible names (FR-19); (b) `ERROR_CODE_COPY.VALIDATION_ERROR → genericError` means a server-side FR-9 validation rejection would read as a generic error — 3.3 should map server validation rejections to validation-flavoured copy where it can distinguish them. [lib/voice/catalog.ts]
