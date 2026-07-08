# Performance Report — BeMad

**Story:** 4.3 (Security & performance review) · **Budgets:** NFR-1 — optimistic UI ≤100 ms; server reconciliation ≤500 ms (p95) under normal conditions.
**Result:** ✅ **Both budgets met with large headroom.**

| Metric | Budget (NFR-1) | Measured | Verdict |
| ------ | -------------- | -------- | ------- |
| Optimistic UI latency (add → pending row rendered) | ≤ 100 ms | **~15–30 ms** | ✅ |
| Server reconciliation (add-click → POST committed), p95 | ≤ 500 ms | **~70 ms** (n=40, warmup 5, max ~140 ms) | ✅ |

Representative local run (Postgres 18, chromium). Absolute numbers vary by machine/CI, but the headroom (optimistic ~4–6× under budget; reconcile ~7× under, worst single sample still ~3.5× under) means the budgets hold comfortably under normal conditions.

## Methodology

Automated in [`tests/e2e/performance.spec.ts`](../../tests/e2e/performance.spec.ts), run on the **chromium project only** (perf timing on the mobile-emulation project adds noise without signal — skipped via `testInfo.project.name`, since both Playwright projects share the chromium engine), against the real database (no interception).

- **Optimistic latency — measured IN-PAGE** to avoid Playwright's ~100 ms locator-polling granularity contaminating the number. A capture-phase `click` listener on the add button stamps `performance.now()` at the click instant; a `MutationObserver` stamps when the pending row (`<li data-pending="true">`) is inserted; the run waits on that in-page marker (the pending row is transient, so a polled locator would miss it). The delta is the time from user action to the optimistic **DOM update** (a synchronous React reducer dispatch, `create/optimistic` in `lib/store/reducer.ts`) — a close proxy for paint.
- **Reconciliation p95** — **wall-clock** from the add-click to the POST response committing (`page.waitForResponse` on `/api/todos` POST — the same commit-proving pattern as `persistence.spec.ts`). **5 warmup creates are discarded** (route compile / connection-pool spin-up), then **40 samples** are reduced with nearest-rank p95 (which drops the top ~2, so a single outlier can't define the result). This is a **conservative upper bound**: it includes a little Playwright click/CDP overhead, so the true server round-trip is even faster than reported.

## Findings & remediation

- **No remediation required** — both metrics are well inside budget. Optimistic updates are immediate (local state), and reconciliation against Postgres is fast.
- **Documented residual (not a budget breach):** the timeout-after-success reconciliation edge — if the server commits but the response is slower than the client's 10 s `AbortSignal.timeout`, the optimistic state rolls back a write the server kept (worst case: a duplicate on create-retry). This is an inherent optimistic + timeout tradeoff needing request idempotency and/or reconcile-on-reload; it is tracked in `deferred-work.md` (Story 2.2) and is unrelated to the NFR-1 latency budgets, which it does not affect.

## How to run locally

```bash
docker compose --profile test up -d --wait db-test
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npm run db:migrate
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npx playwright test performance --project=chromium
```
