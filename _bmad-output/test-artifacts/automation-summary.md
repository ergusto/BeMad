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
  - "_bmad-output/implementation-artifacts/3-1-voice-pack-module-variant-catalog.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 3.1 (Voice pack module & variant catalog)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-08 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 2.4 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest). Story 3.1 is a **pure-data** module: `lib/voice` catalog (22 keys × 5 variants), the `error.code → key` map, and a pure bleep guard. No rotation (3.2), no wiring/DOM (3.3) — so coverage is inherently **unit-only** (no E2E surface yet).
- **Coverage delivered by dev-story:** `tests/unit/voice-catalog.test.ts` — ≥5 variants/key, no blank/dupes, no un-bleeped profanity (+ guard self-test), natural-case (FR-20), full error-code coverage (AD-8), and a catalog snapshot.

## 2. Coverage Plan (one proportional gap)

The dev-story tests already cover the AC surface well. Applying the test-priorities matrix, one worthwhile guard remained, tied to the Epic 2 retro's accessible-name decision:

1. **Control-label conciseness (P2).** In Story 3.3 the voiced *visible* text of buttons becomes their **accessible name** (WCAG 2.5.3). If a button variant were long or multi-line, it would make a poor rotating accessible name (FR-19/FR-20). Added a guard capping button-label variants at ≤40 chars, single-line.

Not added (deliberately):
- **Rendering/rotation/wiring tests** — belong to Stories 3.2 (selector) and 3.3 (provider + E2E for voiced surfaces); there is no rendered surface in 3.1.
- **Semantic-equivalence / "unambiguous" assertions** — not machine-verifiable; enforced by the snapshot + human review of copy.

## 3. Tests Generated

**Unit — `tests/unit/voice-catalog.test.ts`** (+1 describe):
- Every control-label key's variants are ≤40 chars and single-line (usable as rotating accessible names).

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ **141 passed** (was 140) |
| Playwright | ✅ 50 passed, 2 skipped (unchanged; no new surface) |

- Pure functions + static data — fully deterministic, no DB/DOM.
- No new dependencies; `fileParallelism:false` preserved.

## 5. Handoff

Story 3.1's catalog is guarded on structure, bleeping, casing, error-code coverage, control-label usability, and a change-review snapshot. Ready for `code-review`. Rotation-selector tests arrive with Story 3.2; voiced-surface E2E with Story 3.3.
