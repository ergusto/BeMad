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
  - "_bmad-output/implementation-artifacts/3-2-deterministic-rotation-selector-voice-provider.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 3.2 (Deterministic rotation selector & voice provider)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-08 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 3.1 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest). Story 3.2 is the rotation **engine**: a pure selector + per-key controller (`lib/voice/rotation.ts`) and a thin client provider/hook (`lib/voice/provider.tsx`). Pickable logic is pure → unit-testable with no DOM harness; the provider renders nothing yet (wired in 3.3).
- **Coverage delivered by dev-story:** `tests/unit/voice-rotation.test.ts` — selector (no back-to-back repeat, `count===1`→0, reachability, deterministic seeded RNG, edge inputs) + controller (per-key no-repeat, key independence, reachability, deterministic). Seeded mulberry32; no `Math.random`.

## 2. Coverage Plan (one boundary gap)

Applying the test-priorities matrix to pure logic: the AC surface is well covered. One boundary was worth isolating:

1. **2-variant strict alternation (P2).** With exactly 2 variants the "no back-to-back repeat" rule degenerates to strict ping-pong (each pick forces the other index) — a distinct edge from the ≥3-variant case. Added a test asserting `nextVariantIndex(2, …)` alternates 0,1,0,1…

Not added (deliberately):
- **Provider render / hydration / reroll tests** — deferred to Story 3.3's Playwright E2E (the provider isn't rendered until it wraps the app; a real-browser hydration check needs no new jsdom/RTL dependency).
- **Distribution-uniformity assertions** — statistically flaky, low value; reachability already proves every index is used.

## 3. Tests Generated

**Unit — `tests/unit/voice-rotation.test.ts`** (+1):
- Strict alternation with exactly 2 variants (both direct `nextVariantIndex(2,0/1)` and a 50-draw ping-pong).

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ **151 passed** (was 150) |
| Playwright | ✅ 50 passed, 2 skipped (unchanged; provider unrendered) |

- Pure + deterministic (seeded RNG); no DB/DOM; no new dependencies; `fileParallelism:false` preserved.

## 5. Handoff

Story 3.2's rotation engine is guarded on non-repeat, reachability, determinism, per-key independence, and the 1/2/N-variant boundaries. Ready for `code-review`. Provider render + hydration verification arrives with Story 3.3 (voiced-surface E2E).
