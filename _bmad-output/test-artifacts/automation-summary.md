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
  - "_bmad-output/implementation-artifacts/2-3-user-selectable-sort-order.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 2.3 (User-selectable sort order)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-07 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 2.2 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest). Story 2.3 is client-owned, purely-presentational sort (FR-8): a pure `sortEntries` module + a store-derived `sortedEntries` + a `<select>` control. No server surface.
- **Framework present:** `playwright.config.ts` (chromium + mobile), `vitest.config.ts` (`fileParallelism:false`). Playwright Utils enabled.
- **Coverage delivered by dev-story was already strong:** 13 unit tests (all four comparators, pending placement for newest/oldest/active-first, case-insensitive alphabetical + tiebreaks, non-mutation, empty, stable equal-keys) + 8 E2E (default + each option × chromium/mobile).

## 2. Coverage Plan (two real gaps)

Applying the test-priorities matrix:

1. **Cross-feature: sort + optimistic create (P1).** The dev-story E2E only exercised sorting on a static seeded list. The interesting integration — a newly-created task is **appended last** to canonical `entries` but must be **sorted** into place by the active order — was unproven in-browser. This is exactly where a "sort just reads canonical order" regression would hide.
2. **Alphabetical + pending (P2).** Unit pending-placement covered newest/oldest/active-first but not alphabetical (a pending entry should sort by its `text` like any saved entry).

Not added (deliberately):
- **Store-level React integration test** — still needs a React Testing Library harness (a new dependency); covered at E2E level instead. Tracked deferral for Story 4.1/4.2.
- **Sort persistence across reload** — fenced out of scope by the story (selection is session-only); no test needed.

## 3. Tests Generated

**Unit — `tests/unit/todo-sort.test.ts`** (+1):
- Alphabetical ordering places a pending entry by its text among saved entries.

**E2E — `tests/e2e/sort.spec.ts`** (+1):
- "a new task is sorted by the active order (newest → top), not just appended": with the default `newest` sort, a held-POST create shows the optimistic pending row **at the top** (though canonical order appends it last), and it stays at the top after commit (its `createdAt` is newest). Proves `sortedEntries` reorders the appended pending row rather than rendering raw canonical order.

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ **131 passed** (was 130) |
| Playwright (chromium + mobile) | ✅ **42 passed**, 2 skipped |

- Deterministic: GET/POST interception via `page.route`; no DB or timing reliance.
- No new dependencies; `fileParallelism:false` preserved.

## 5. Handoff

Story 2.3 coverage spans pure-comparator units (all options, edge cases, pending, stability, non-mutation) and full-flow E2E (each option reorders; sort composes correctly with optimistic create). Ready for `code-review`.
