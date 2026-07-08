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
  - "_bmad-output/implementation-artifacts/3-3-wire-all-surfaces-to-the-voice-pack.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 3.3 (Wire all surfaces to the voice pack)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-08 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 3.2 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest). Story 3.3 wired every surface to the voice pack, threaded `error.code` through the store, added fixed sort copy + CSS caps, and migrated the whole E2E suite to `data-testid`.
- **Coverage delivered by dev-story was extensive:** store unit tests updated to the code-based error shape; a no-hardcoded-strings guard (`voice-wiring.test.ts`); the entire E2E suite migrated + error-path assertions switched to voiced; new `voice.spec.ts` (hydration, voiced copy, voiced error).

## 2. Coverage Plan (two on-point gaps)

For a *voicing* story the highest-value guards are behavioural-voice properties the dev tests didn't isolate:

1. **Sort labels are the fixed voiced copy (FR-17/FR-14, the 3.1 deferral) (P1).** Nothing asserted the sort options render `FIXED_COPY` (non-rotating). Added a check that the `<option>` texts equal `FIXED_COPY` in `SORT_OPTIONS` order.
2. **FR-20 caps are CSS-only AND the quiet-aside is exempt (P1).** Added a computed-style check: a normal voiced control has `text-transform: uppercase`, while the delete-cancel "quiet aside" is `none` — proving the `.voice` / `.voice-quiet` split (and that caps aren't stored).

Not added (deliberately):
- **"Re-roll changes the label across activations"** — hard to assert deterministically without flakiness (rotation is random-but-no-repeat); the unit rotation tests (Story 3.2) already prove no-back-to-back + reachability, and `voice.spec` proves controls show catalog copy.
- **Provider render internals** — covered structurally + by the hydration E2E.

## 3. Tests Generated

**E2E — `tests/e2e/voice.spec.ts`** (+2):
- Sort options render the fixed voiced copy (`FIXED_COPY`, in `SORT_OPTIONS` order).
- ALL-CAPS is CSS-only: a voiced control computes `text-transform: uppercase`; the delete-cancel quiet-aside computes `none` (FR-20 exemption).

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ **156 passed** (unchanged — additions are E2E) |
| Playwright (chromium + mobile) | ✅ **60 passed**, 2 skipped (was 56) |

- Deterministic: GET interception + computed-style/`allInnerTexts` reads; imports `VOICE_CATALOG`/`FIXED_COPY` to assert copy comes from the pack. No new deps; `fileParallelism:false` preserved.

## 5. Handoff

Story 3.3 is covered end-to-end: no-hardcoded-strings guard, full E2E on `data-testid`, hydration, voiced copy, voiced errors, fixed sort copy, and the FR-20 caps/exemption. Ready for `code-review`. The formal a11y/axe audit is Story 3.4.
