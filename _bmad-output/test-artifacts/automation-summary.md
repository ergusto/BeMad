---
stepsCompleted:
  [
    "step-01-preflight-and-context",
    "step-02-identify-targets",
    "step-03-generate-tests",
    "step-04-validate-and-summarize",
  ]
lastStep: "step-04-validate-and-summarize"
lastSaved: "2026-07-08"
inputDocuments:
  - "_bmad-output/implementation-artifacts/4-1-complete-the-e2e-suite.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 4.1 (Complete the E2E suite)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-08 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 3.4 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest). Story 4.1 completed the E2E suite: added new-session persistence, wired the isolated `test` compose DB (`test:e2e:compose`), removed the skipped smoke placeholder.
- **Coverage delivered by dev-story:** `persistence.spec.ts` (create survives a fresh `browser.newContext()`); the suite is 76 green, 0 skipped, covering every AD-13 journey.

## 2. Coverage Plan (one durability gap)

The dev-story persistence spec proved *creation* survives a new session. The symmetric guarantee — that a **deletion** is equally durable server-side — wasn't covered:

1. **Deletion durability across a new session (P2).** Added a test: create + delete (with confirm) in session A, then a fresh context confirms the task is absent — proving the removal persisted server-side, not just in session A's client.

Not added (deliberately):
- **Edit/toggle across a new session** — reload-based specs already prove edit/toggle persistence; a new-session variant is marginal over the create + delete session tests.
- **Running `test:e2e:compose` here** — its `CI=1` step boots a server on :3000 (collides with the session dev server); the DB pipeline (compose up --wait + migrate) is verified, and the full run is for CI/clean env.

## 3. Tests Generated

**E2E — `tests/e2e/persistence.spec.ts`** (+1):
- "a deletion is durable across a brand-new session" — create+delete in one context, fresh context confirms absence.

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ 156 passed |
| Playwright (chromium + mobile) | ✅ **78 passed**, 0 skipped (was 76) |

- Deterministic real-DB tests (unique text, position-independent). No new deps; `fileParallelism:false` preserved.

## 5. Handoff

Story 4.1's E2E suite is complete: all AD-13 journeys covered incl. create + delete durability across new sessions, isolated `test` compose DB wired, zero skipped tests (78 green). Ready for `code-review`. Coverage % gate + a11y audit doc are Story 4.2.
