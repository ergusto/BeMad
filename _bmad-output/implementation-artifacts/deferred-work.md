# Deferred Work

## Deferred from: code review of story-1.2 (2026-07-06)

- **CRUD integration tests skip silently without `TEST_DATABASE_URL`** — a CI/local run without the test DB reports green while the data layer is unexercised. Systemic fix: Story 4.2's ≥70% coverage gate fails if these are skipped, and CI must provide the `test`-profile Postgres. Revisit when CI is set up. [tests/integration/repository.test.ts]
- **`healthcheck()` timeout does not cancel the in-flight query** — on timeout it rejects but the query keeps holding one of the pool's 5 connections until the DB answers; sustained partial outage could pin the pool. Pre-existing Story 1.1 code; postgres.js has no simple per-query cancel. Options if it manifests: dedicated health connection, or lower/again-bounded pool. [lib/db/repository.ts healthcheck]

## Deferred from: code review of story-1.3 (2026-07-06)

- **E2E test-DB isolation & cleanup** — `playwright.config.ts` `webServer` runs `npm run dev` against ambient `DATABASE_URL` with no isolation; `create-view.spec.ts` persists a durable row per run. Risks polluting a real DB and cross-run accumulation / `fullyParallel` cross-test interference. Fix in Story 4.1 when the full ≥5-test E2E suite is assembled: wire the `test` compose profile as the E2E DB and add truncation/cleanup (global setup or per-spec). [playwright.config.ts, tests/e2e/*]

## Deferred from: code review of story-1.4 (2026-07-06)

- **No client-side fetch timeout / AbortController** — `createTodo`/`updateTodo` (and the create/edit UI) have no request timeout; if a mutation hangs, `submitting`/`saving` never clears and the edit row is stuck (Cancel is disabled during save). Address in Story 2.2 (optimistic + rollback), which owns in-flight/abort handling. [lib/todos-client.ts, app/todo-app.tsx]

## Deferred from: code review of story-1.5 (2026-07-06)

- **Toggle-failure UI test** — the toggle error path (surface error, leave checkbox at true server state) is implemented and confirmed correct by review, but has no automated test; a component-level test needs a harness (React Testing Library, a new dependency). Add when a component-test harness is introduced, or cover via a fault-injection E2E in Story 4.1. [app/todo-app.tsx]

## Deferred from: code review of story-1.6 (2026-07-06)

- **Fuller confirm-dialog accessibility** — the delete confirmation now moves focus to Cancel on open (safe default), but focus RETURN to the trigger on cancel and an `aria-live` announcement of the prompt are deferred to Story 3.4 (accessibility) / the Story 4.2 axe audit. [app/todo-app.tsx]
- (Client fetch timeout/AbortController for hung mutations — already tracked under the Story 1.4 defer for Story 2.2.)
