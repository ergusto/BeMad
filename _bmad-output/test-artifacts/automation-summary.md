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
  - "_bmad-output/implementation-artifacts/3-4-accessibility-of-rotating-copy-wcag-2-2-aa.md"
  - "_bmad-output/project-context.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-levels-framework.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-priorities-matrix.md"
  - ".claude/skills/bmad-testarch-automate/resources/knowledge/test-quality.md"
---

# Test Automation Expansion — Story 3.4 (Accessibility of rotating copy, WCAG 2.2 AA)

**Author:** Murat (Master Test Architect) · **Date:** 2026-07-08 · **Mode:** Create · **Execution:** sequential

_(Supersedes the Story 3.3 automation summary.)_

## 1. Preflight & Context

- **Stack:** fullstack (Next 16 / React 19 + Playwright + Vitest + `@axe-core/playwright`). Story 3.4 added stable accessible names (as visible labels rotate), keyboard operability + focus-return, a focus-visible ring, and an axe audit.
- **Coverage delivered by dev-story:** `tests/e2e/a11y.spec.ts` — axe scans (empty / list / delete-confirm dialog) at WCAG 2.2 A/AA (zero critical, zero serious bar the documented Label-in-Name trade-off); keyboard-only core flow; accessible-name-stability across a re-roll; delete-confirm focus-return.

## 2. Coverage Plan (two missed surfaces)

The dev-story axe scans covered the main states but not two distinct DOM surfaces:

1. **Edit-in-place form open (P1).** A separate surface (edit input + Save/Cancel) not previously axe-scanned. Added a scan with the editor open.
2. **Load-error state (P1).** The `role="alert"` load-error block (voiced message + Retry) was unscanned. Added a scan of the error state.

Not added (deliberately):
- **Per-row control aria-name stability** — the Add-button stability test already proves the pattern; row controls unmount on activation (edit) so they don't lend themselves to a before/after on the same element.
- **Manual screen-reader testing** — out of scope for automated E2E.

## 3. Tests Generated

**E2E — `tests/e2e/a11y.spec.ts`** (+2):
- axe scan of the edit-in-place form open → no blocking violations.
- axe scan of the load-error state → no blocking violations.

Also hardened a pre-existing intermittent flake in `voice.spec.ts` (sort-options read before the ready render) with an explicit `toBeVisible()` wait.

## 4. Validation

| Gate | Result |
| ---- | ------ |
| `tsc --noEmit` | ✅ clean |
| `eslint .` | ✅ clean |
| Vitest (with `TEST_DATABASE_URL`) | ✅ **156 passed** (unchanged — additions are E2E) |
| Playwright (chromium + mobile) | ✅ **74 passed**, 2 skipped (was 70) |

- axe gate: zero critical + zero serious (except the documented `label-content-name-mismatch`) across empty / list / dialog / edit / error states. Deterministic via interception; no new deps; `fileParallelism:false` preserved.

## 5. Handoff

Story 3.4 is covered by axe scans across all five UI states, keyboard-only flow, focus-return, and aria-name stability. Ready for `code-review`. This completes Epic 3's test surface (the a11y story).
