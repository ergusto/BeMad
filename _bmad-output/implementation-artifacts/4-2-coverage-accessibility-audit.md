---
baseline_commit: 4d3734ff980f8ac1c23046e2955ad2dc8ec048c7
---

# Story 4.2: Coverage & accessibility audit

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a stakeholder,
I want measured coverage and a clean accessibility audit,
so that quality is evidenced, not assumed.

## Acceptance Criteria

1. **Given** the test suites, **when** coverage is measured, **then** **meaningful coverage is ≥70% and reported** (AD-13), enforced by a **coverage gate in the Vitest config**.
2. **And** an **axe-core** accessibility audit shows **zero critical WCAG 2.2 AA violations**, documented as a **QA report under `docs/qa/`**.

## Tasks / Subtasks

- [x] **Task 1 — Vitest coverage gate ≥70% (meaningful)** (AC: #1)
  - [x] Added `test:coverage` script (`vitest run --coverage`) and configured `vitest.config.ts` `coverage` (v8) with **thresholds** statements/functions/lines 85, branches 80 — the run FAILS below (verified: exit 1 at `lines=99`, exit 0 at the set gate).
  - [x] Scoped to the logic layer: `include: ["lib/**", "app/api/**"]`, `exclude: ["**/*.tsx"]`. React `.tsx` are E2E-covered (node-env Vitest doesn't render them) — categorical rule, not per-file cherry-picking. Barrels/glue kept in (they read as covered on import; `db/index.ts` + `todos/index.ts` are real tested logic, NOT excluded).
  - [x] Measured first: `.ts` logic = **94.5% stmts / 96.05% branch / 98.03% funcs / 94.32% lines** — comfortably above the AD-13 floor of 70; gate set at 85/80 with headroom.
  - [x] Reporter `["text", "html"]` → console summary + `./coverage`; captured in `docs/qa/test-coverage.md`. Also switched CI's Vitest step to `npm run test:coverage` so the gate actually gates.
- [x] **Task 2 — Tighten the axe allowlist (closes the Story 3.4 defer)** (AC: #2)
  - [x] Replaced the blanket `label-content-name-mismatch` suppression with a per-node allowlist of the 9 rotating controls (by `data-testid`): a mismatch on any other control (sort select, checkbox, future control) now fails the audit.
  - [x] Re-ran the a11y suite: 7/7 green on both projects — the intended rotating controls are the only allowed mismatches; zero critical, zero other serious.
- [x] **Task 3 — Accessibility QA report under `docs/qa/`** (AC: #2)
  - [x] **NEW** `docs/qa/accessibility-audit.md`: axe tool/version, WCAG 2.2 A/AA tags, the 5 states scanned, zero-critical result, keyboard + focus-return coverage, CI note, and a **known-gap** note for the post-delete-confirm focus (out of this story's no-app-change scope).
  - [x] Documented the WCAG 2.5.3 (Label in Name) trade-off as the standing Epic 3 decision.
- [x] **Task 4 — Coverage QA report + notes** (AC: #1)
  - [x] **NEW** `docs/qa/test-coverage.md`: measured %, the 85/80 gate, **what-is-covered-where** (Vitest=logic; Playwright=UI journeys, 39×2=78), the `TEST_DATABASE_URL` note (skipping integration drops `lib/db` coverage → gate surfaces it), and the RTL deferral.
  - [x] Typecheck ✓, lint ✓, `npm run test:coverage` passes the gate, 156 Vitest + 78 Playwright green, a11y green with the tightened allowlist. `fileParallelism:false` kept.

## Dev Notes

### What this story does (AD-13 — evidence, not assumption)

Epics 1–4.1 built the tests; 4.2 **measures and documents** quality: a real coverage gate (≥70% on the logic Vitest owns) + a written accessibility audit (zero critical WCAG 2.2 AA) under `docs/qa/`. It also tightens the one axe allowlist deferred from Story 3.4.

### The coverage-scoping decision (read carefully)

**Vitest coverage only reflects code Vitest executes** (unit + integration). The UI in `app/` (e.g. `app/todo-app.tsx`) is exercised by **Playwright E2E**, which Vitest's v8 coverage does NOT see. So:

- A naive global threshold including `app/**` would report ~0% for the UI and fail spuriously — it would measure "UI not unit-tested", which is by design (the UI is E2E-tested).
- **Scope the Vitest gate to the logic layer** (`lib/**`: repository, http, todos schema, store reducer/sort/rotation, voice catalog/bleep). Exclude test files, `*.config.*`, type-only modules, and files exercised **only** by Playwright/SSR (e.g. the React providers `lib/voice/provider.tsx` and the client-only parts of `lib/store/todo-store.tsx`, and thin DB glue `lib/db/client.ts`/`index.ts`/`schema.ts`) — **each with a one-line justification in the config**, and only after measuring. Never exclude a genuinely-unit-testable logic file to hit the number; add tests instead.
- The QA report makes the split explicit: **Vitest ≥70% on logic; Playwright 78 tests on the UI journeys** (the 4.1 coverage map). Together that's the "meaningful coverage."

Merging Playwright + Vitest coverage into one number (via instrumented Next build) is out of scope and over-engineering (AD-3 simplicity) — the two-report approach is honest and clear.

### Current state to build on

- `vitest.config.ts` already has a `coverage` block (v8, `reportsDirectory: ./coverage`) with a comment "thresholds enforced in Story 4.2" — add `thresholds` + `include`/`exclude` there. `@vitest/coverage-v8@4.1.9` is installed (no new dep).
- `tests/e2e/a11y.spec.ts` currently filters `label-content-name-mismatch` for the whole page — Task 2 narrows it to the rotating controls.
- No `docs/qa/` dir yet — create it.
- CI (`.github/workflows/ci.yml`, Story 4.1) runs Vitest with `TEST_DATABASE_URL` (integration included) + the E2E suite; the axe audit runs inside the E2E suite.

### Scope fences (do NOT build here)

- **Security/perf review** (XSS-inert test, timings) → **Story 4.3**. **README/runbook** → **Story 4.4**.
- **No Lighthouse dependency** — the AC says "axe-core/**Lighthouse**" (either); axe-core is already integrated and satisfies it. Don't add Lighthouse (avoid a new dep + flaky perf-audit noise).
- **No RTL component harness** — not required; coverage is scoped to logic Vitest already tests. (RTL stays a documented recurring deferral.)
- **No app/lib behaviour changes.** Only test/config/docs (+ the a11y-spec allowlist tightening). No new runtime deps.

### Architecture compliance (guardrails)

- **AD-13:** ≥70% meaningful coverage, axe a11y, all reported. **AD-3:** keep it simple — two clear coverage reports, not a fragile merged-instrumentation pipeline. **AD-10/WCAG 2.2 AA:** zero critical, documented.
- The a11y allowlist tightening upholds FR-20/AD-10 while keeping the rotating-voice 2.5.3 trade-off intentional and bounded.

### Learnings carried from Epics 1–4.1 (apply them)

- **v8 coverage `include`/`exclude` + `thresholds`** in `vitest.config.ts` `coverage`. Measure with `vitest run --coverage`; the text reporter prints per-file %.
- **Integration tests gate on `TEST_DATABASE_URL`** (skip without it) — run coverage WITH it (`TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test`) so `lib/db` is counted; document that skipping them drops coverage.
- **The axe audit lives in `a11y.spec.ts`** (Story 3.4) — scans empty/list/dialog/edit/error, zero critical; the QA doc summarizes it.
- **Test infra:** `fileParallelism:false`; Node 24; no new deps. `docs/qa/` is the QA artifact home (AC).

### Latest tech information

- **Vitest 4 coverage** (`@vitest/coverage-v8`): configure under `test.coverage` — `provider: "v8"`, `include`, `exclude`, `thresholds: { lines, functions, statements, branches }` (a failing threshold exits non-zero → the gate). `reporter: ["text", "html"]` for console + `./coverage` HTML.
- **`@axe-core/playwright`**: filter violations by `id`/`impact`; to allowlist by control, cross-reference `violation.nodes[].target` against the known rotating-control selectors/test-ids rather than dropping the rule globally.

### Project Structure Notes

- **UPDATE:** `vitest.config.ts` (coverage include/exclude + thresholds), `package.json` (`test:coverage`), `tests/e2e/a11y.spec.ts` (allowlist), possibly small **NEW** unit tests if a logic file is under 70%.
- **NEW:** `docs/qa/accessibility-audit.md`, `docs/qa/test-coverage.md`.
- **PRESERVE:** all app/lib behaviour, the existing suites.

### References

- [Source: planning-artifacts/epics.md#Story-4.2] ACs (≥70% meaningful coverage reported; axe/Lighthouse zero-critical WCAG 2.2 AA; coverage gate in Vitest config; a11y output under `docs/qa/`)
- [Source: planning-artifacts/architecture/*ARCHITECTURE-SPINE*.md#AD-13] ≥70% meaningful coverage, axe a11y; [#AD-3] simplicity; [#AD-10] a11y contract
- [Source: vitest.config.ts] the reserved coverage block; [Source: package.json] `@vitest/coverage-v8` present, scripts
- [Source: tests/e2e/a11y.spec.ts] the axe audit + the blanket allowlist to tighten (Story 3.4 defer)
- [Source: implementation-artifacts/deferred-work.md] Story-3.4 "tighten the axe label-content-name-mismatch allowlist"; Epic-1 "integration tests skip silently without TEST_DATABASE_URL — enforce via 4.2 coverage gate"
- [Source: implementation-artifacts/4-1-complete-the-e2e-suite.md] the 78-test E2E coverage map (UI journeys) to reference in the coverage report
- [Source: _bmad-output/project-context.md] ≥70% meaningful coverage; WCAG 2.2 AA; no new deps

## Senior Developer Review (AI)

**Date:** 2026-07-08 · **Outcome:** Approve (all patch findings fixed) · **Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (adversarial, parallel).

The Acceptance Auditor confirmed both ACs are met (real coverage gate ≥70% reported; axe zero-critical documented under `docs/qa/`; scope fences + standing constraints upheld). Two reviewers independently caught one real HIGH defect.

### Review Findings

- [x] **[Review][Patch] HIGH — The store reducer was silently excluded from the coverage gate; docs claimed it was counted** [vitest.config.ts / lib/store/todo-store.tsx] — `todoReducer` (the optimistic-mutation state machine, unit-tested by 30+ assertions) lived in `lib/store/todo-store.tsx` and was dropped by `exclude: ["**/*.tsx"]`, so the single most important pure-logic module was NOT in the gate — while `docs/qa/test-coverage.md` listed it as counted. **Fixed:** extracted the pure reducer + types + helpers to `lib/store/reducer.ts` (a `.ts` module, now gated at 97%); `todo-store.tsx` keeps only the React provider and re-exports the pure surface (no behaviour change; all imports/tests unchanged). Denominator grew 200→235; overall coverage 94.89%.
- [x] **[Review][Patch] MED — Label-in-name allowlist matched the whole subtree html** [tests/e2e/a11y.spec.ts] — `isAllowlistedLabelMismatch` searched the flagged node's full `outerHTML`, so a real mismatch on an *ancestor* that merely contained an allowlisted control would be wrongly tolerated. **Fixed:** now matches the flagged element's own opening tag (+ target selectors) only.
- [x] **[Review][Patch] LOW — Empty-node label-in-name violation would fail open** [tests/e2e/a11y.spec.ts] — `[].every(...)===true` meant a zero-node violation was treated as allowlisted. **Fixed:** require `nodes.length > 0` (fail closed).
- [x] **[Review][Patch] LOW — QA doc referenced a config option (`all: true`) not present in the committed config** [docs/qa/test-coverage.md] — **Fixed:** removed; documented that Vitest 4 includes all matching files by default.
- [x] **[Review][Patch] LOW — Inconsistent axe-scan count in the a11y doc** [docs/qa/accessibility-audit.md] — **Fixed:** now "4 axe-scan tests (5 scans across the 5 states) + 3 behavioural".
- [x] **[Review][Dismiss] The allowlist permanently tolerates label-in-name on its 9 controls** — by design: those controls have rotating visible text ≠ stable aria-label *forever* (the documented 2.5.3 trade-off); `add-task`'s stable name is additionally asserted by a dedicated test. Not a defect.
- [x] **[Review][Dismiss] Moderate-impact axe violations don't block** — by design and documented: the gate is "fail on critical; fail on serious except the allowlisted trade-off", which is already stricter than the AC (zero critical).

Post-fix gates: typecheck ✓, lint ✓, 156 Vitest (coverage **94.89% / 94.44% / 98.41% / 94.73%**, gate exit 0), 78 Playwright ✓.

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Coverage gate (AC #1):** `vitest.config.ts` `coverage` scoped to `lib/**` + `app/api/**`, excluding `**/*.tsx` (React → E2E-covered), with thresholds 85/80/85/85. Measured logic-layer coverage **94.5% stmts / 96.05% branch / 98.03% funcs / 94.32% lines** — well above the AD-13 floor of 70. Gate verified to bite (exit 1 at an inflated threshold). `npm run test:coverage` added; CI's Vitest step switched to it so the gate is enforced. Removed a `coverage.all` line that isn't in Vitest 4's type (v4 includes all matching files by default — confirmed by the 200-statement denominator).
- **A11y allowlist (AC #2):** tightened `tests/e2e/a11y.spec.ts` from a page-wide `label-content-name-mismatch` suppression to a 9-control `data-testid` allowlist — a mismatch on any other control fails. Closes the Story 3.4 deferral. 6 axe scans + behavioural checks green on both projects (the one CI-cold flake on the keyboard test passed on isolated re-run).
- **QA docs (AC #1/#2):** `docs/qa/accessibility-audit.md` + `docs/qa/test-coverage.md` — the "what's covered where" split (Vitest logic ~94% vs Playwright 78 UI journeys) is the honest reading of "meaningful coverage"; merging the two coverage sources was rejected as over-engineering (AD-3).
- **Deferred (documented, not done here):** post-delete-confirm focus destination requires an app behaviour change (out of this measure-and-document story's fence) — recorded in `deferred-work.md` + the audit doc. RTL harness remains deferred.
- **No app/lib behaviour changes; no new dependencies.**

### File List

- `lib/store/reducer.ts` (NEW, review fix) — pure reducer/state-machine + types + helpers extracted from `todo-store.tsx` so they're counted by the gate (no behaviour change)
- `lib/store/todo-store.tsx` (UPDATE, review fix) — now the React provider only; imports + re-exports the pure core from `./reducer`
- `vitest.config.ts` (UPDATE) — coverage include/exclude + thresholds (the gate)
- `package.json` (UPDATE) — `test:coverage` script
- `.github/workflows/ci.yml` (UPDATE) — CI Vitest step runs `test:coverage` (enforce the gate)
- `tests/e2e/a11y.spec.ts` (UPDATE) — tighten the label-in-name allowlist to specific rotating controls
- `docs/qa/accessibility-audit.md` (NEW) — axe audit QA report
- `docs/qa/test-coverage.md` (NEW) — coverage QA report
- `_bmad-output/implementation-artifacts/deferred-work.md` (UPDATE) — reconcile resolved items + new 4.2 defers

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-08 | Story 4.2 drafted (ready-for-dev): Vitest ≥70% coverage gate scoped to the logic layer (UI covered by Playwright, documented, not gamed); tighten the axe `label-content-name-mismatch` allowlist to the rotating controls (closes the 3.4 defer); QA reports under `docs/qa/` (accessibility audit: zero critical WCAG 2.2 AA; coverage report incl. what's covered where + the TEST_DATABASE_URL note). No app/lib changes, no new deps. |
| 2026-07-08 | Story 4.2 implemented (→ review): coverage gate (v8, scoped to `lib/**`+`app/api/**`, exclude `**/*.tsx`, thresholds 85/80) — measured 94.5% logic coverage, gate verified to bite; `test:coverage` script + CI enforcement. Tightened the axe allowlist to 9 rotating controls by `data-testid`. Added `docs/qa/accessibility-audit.md` + `docs/qa/test-coverage.md`. Reconciled `deferred-work.md`. Gates: typecheck ✓, lint ✓, 156 Vitest + 78 Playwright green, coverage 94.5% ≥ 85%. |
| 2026-07-08 | Code review (adversarial 3-layer) → **done**. Fixed HIGH: extracted the pure reducer to `lib/store/reducer.ts` so it's genuinely gated (was excluded via `**/*.tsx` while docs claimed it counted) — coverage now 94.89% over 235 stmts. Fixed MED/LOW: a11y allowlist matches the flagged element's own opening tag (not its subtree) + fail-closed on empty nodes; removed the stale `all: true` doc claim; corrected the axe-scan count. 2 findings dismissed by design. Post-fix: typecheck ✓, lint ✓, 156 Vitest + 78 Playwright green, gate exit 0. |
