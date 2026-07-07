---
stepsCompleted:
  [
    "step-01-preflight-and-context",
    "step-02-identify-targets",
    "step-03-generate-tests",
    "step-04-validate-and-summarize",
  ]
lastStep: "step-04-validate-and-summarize"
lastSaved: "2026-07-07"
inputDocuments:
  - "_bmad-output/implementation-artifacts/2-2-optimistic-mutations-with-rollback.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 2.2 (Optimistic mutations with rollback)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-07 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 2.1 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest). Story 2.2 is a client-state change (AD-7 optimistic + rollback) on the AD-14 single store, plus a client-wrapper timeout. Surface = the pure reducer (8 new actions), the store orchestration, the `request()` wrapper, and the store-driven UI.
- **Framework present:** `playwright.config.ts` (chromium + mobile), `vitest.config.ts` (`fileParallelism:false`). Playwright Utils enabled (network-first interception is the house pattern).
- **Coverage delivered by dev-story was already strong:** reducer unit tests fully rewritten around the optimistic actions (create/update/delete × optimistic/commit/rollback, no-op-when-not-ready, pending-guard) + `optimistic.spec.ts` (reconcile happy path + create/toggle/delete rollback via `page.route`).

## 2. Coverage Plan (two real gaps)

Applying the test-priorities matrix, two P1 gaps remained after dev-story:

1. **The new `request()` timeout/network path had no direct test.** `AbortSignal.timeout` → `TodoApiError` mapping is the safety net that turns a hung mutation into a normal failure → rollback. Untested, it could silently regress (e.g. a refactor that swallows the abort).
2. **The `edit` rollback case (AC #2, first bullet) was not covered by E2E.** `create`/`toggle`/`delete` rollback each had a spec; `edit` — restore prior text **but keep the typed draft to retry** — is the most nuanced FR-10 rule and had none.

Not added (deliberately, with rationale):
- **Perf assertion (≤100 ms / ≤500 ms p95)** — out of scope here; owned by Story 4.3 (measurement). This story makes it optimistic; 4.3 verifies the budget.
- **Toggle-failure component test** — still needs a React Testing Library harness (a new dependency); the toggle rollback is covered at E2E level instead. Remains a tracked deferral for Story 4.1/4.2.

## 3. Tests Generated

**Unit — `tests/unit/todos-client.test.ts`** (+3, new `describe`: "request timeout / network handling"):
- AbortSignal `TimeoutError` → `TodoApiError { code: UNKNOWN, "The request timed out. Please try again." }`.
- Generic network rejection → `TodoApiError { code: UNKNOWN, "Network error. Please try again." }`.
- Every request attaches an `AbortSignal` (the timeout bound is actually wired).

**E2E — `tests/e2e/optimistic.spec.ts`** (+1):
- **edit rollback**: PATCH forced to 500 → error banner shown, the editor stays open with the typed draft (`edited attempt`), and Cancel returns the row to its prior text. (Complements the existing reconcile / create / toggle / delete specs.)

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ **115 passed** (was 112) |
| Playwright (chromium + mobile) | ✅ **30 passed**, 2 skipped (smoke placeholders) |

- Deterministic: all new tests use `page.route` interception or mocked `fetch` — no reliance on a real DB or timing.
- No new dependencies; `fileParallelism:false` preserved.

## 5. Handoff

Story 2.2 test coverage is comprehensive across levels (pure-reducer unit, client-wrapper unit incl. the timeout net, and full-flow E2E for all four optimistic ops + reconcile). Ready for `code-review`.
