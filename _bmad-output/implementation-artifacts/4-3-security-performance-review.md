---
baseline_commit: 5251dae
---

# Story 4.3: Security & performance review

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a stakeholder,
I want the app checked for common vulnerabilities and against its performance budgets,
so that it is safe and fast enough.

## Acceptance Criteria

1. **Given** the app, **when** reviewed, **then** task-text rendering is confirmed **XSS-safe** — no `dangerouslySetInnerHTML`; a script-injection payload **renders as inert text** (AD-11) — proven by an E2E test.
2. **And** a performance check confirms **optimistic UI ≤100 ms** and **server reconciliation ≤500 ms p95** under normal conditions (NFR-1), with **findings and any remediations documented** in a QA report under `docs/qa/`.

## Tasks / Subtasks

- [x] **Task 1 — XSS-inert E2E test (AC #1)** (AD-11)
  - [x] **NEW** `tests/e2e/security.spec.ts`: both vectors (`<script>` + `<img onerror>`). Asserts literal `.todo-text`, no injected `script/img` element, `window.__xss` undefined (via `addInitScript` reset), and re-asserts all three in a brand-new browser context (real Postgres round-trip). Real-DB, `data-testid` locators, `waitForResponse` to prove the POST/GET.
  - [x] Real-DB round-trip used (no interception) — proves stored-then-rendered inertness.
- [x] **Task 2 — Performance measurement E2E (AC #2)** (NFR-1)
  - [x] **NEW** `tests/e2e/performance.spec.ts`: optimistic latency measured IN-PAGE (capture-phase click stamp + `MutationObserver` on `li[data-pending="true"]`, waited via `waitForFunction` on the in-page marker — the pending row is transient so a polled locator would miss it) → assert ≤100. Reconciliation p95 over 15 samples via `waitForResponse` on the POST → assert ≤500. Chromium-only (`test.skip` on non-chromium).
  - [x] Measured (local, Postgres 18, chromium): **optimistic ~13 ms**, **reconcile p95 ~97 ms** — both well within budget. Captured via test annotations → JSON reporter → the QA doc.
- [x] **Task 3 — Security review QA report (AC #1)**
  - [x] **NEW** `docs/qa/security-review.md`: no `dangerouslySetInnerHTML` (grep), React auto-escaping of text + attributes, payloads tested + inert result + round-trip, other hardened surfaces (Drizzle parameterization, `todoTextSchema` NUL/length, coded errors AD-8), v1 scope (no auth, NFR-6).
- [x] **Task 4 — Performance QA report (AC #2)**
  - [x] **NEW** `docs/qa/performance.md`: methodology, measured vs NFR-1 budgets (pass, large headroom), no remediation needed, and the timeout-after-success reconciliation residual noted as documented (not a budget breach).
  - [x] Typecheck ✓, lint ✓, 156 Vitest + coverage gate ✓ (94.89%), 86 Playwright green (incl. new specs). `fileParallelism:false` + Playwright config unchanged.

## Dev Notes

### What this story does (prove safe + fast)

Epic 4 is verification. 4.3 adds the **security** proof (XSS-inert rendering, AD-11) and the **performance** proof (NFR-1 budgets), each as an automated E2E test plus a QA report under `docs/qa/`. Like 4.2, it is a **measure-and-document** story: no app/lib behaviour changes, no new dependencies — only new test specs and docs.

### Current state (what's already true — the tests confirm it)

- **No `dangerouslySetInnerHTML` anywhere** in `app/` or `lib/` (verified by grep). All user text renders via React children (`<span className="todo-text">{entry.text}</span>`, `{message.text}`, etc.) and escaped attributes (`aria-label={`Completed: ${entry.text}`}`) — React escapes both, so a `<script>`/`onerror` payload becomes inert text. The test proves the invariant and guards against a future regression.
- **Optimistic UI** is a synchronous reducer dispatch on the user action (`create/optimistic` etc. in `lib/store/reducer.ts`, driven by the provider in `lib/store/todo-store.tsx`), so the pending row paints within a frame — comfortably inside 100 ms. Reconciliation is the POST/PATCH/DELETE round-trip to `app/api/todos/**` → Postgres.
- The store already carries a pending marker for optimistic creates (`pending: true`); the UI renders a pending/"saving" indicator (`data-testid="saving"`). Use the appearance of the pending row (the `<li>` containing the new text, and/or its `saving` testid) as the optimistic-paint signal. **Verify exact testids in `app/todo-app.tsx` before writing the observer.**

### Measurement precision (avoid flaky/false perf numbers) — apply the Epic-2 lesson

- **Do NOT** measure optimistic latency as `click → locator.waitFor()` wall-clock — Playwright's locator polling (~100 ms granularity) would dominate the number and either flake or report a meaningless ~100 ms. Measure in-page with `performance.now()` + a `MutationObserver`, as described in Task 2.
- For reconciliation, `page.waitForResponse` on the actual POST is the honest signal that the server committed (same pattern proven in `tests/e2e/persistence.spec.ts`). Compute p95 over multiple samples — a single sample is not a p95.
- Give both assertions the NFR-1 thresholds exactly (100 / 500). The large headroom (single-digit ms optimistic; <100 ms local reconcile) keeps them non-flaky; if a measurement is surprisingly close to budget, investigate and document rather than loosening the threshold.

### Scope fences (do NOT build here)

- **README / delivery docs** → **Story 4.4**. Only security/perf verification + their two QA docs here.
- **No app/lib behaviour changes, no new deps.** If proving XSS-safety or measuring perf seems to *need* an app change, it doesn't — the invariants already hold; you're proving them. (The one exception a reviewer might raise — needing a stable testid on the pending row — already exists; reuse it.)
- **Do NOT "fix" the timeout-after-success reconciliation caveat** (`deferred-work.md`, Story 2.2) — it's an inherent optimistic+timeout tradeoff needing idempotency/reconcile work, out of scope. Note it in the perf report as a documented residual.

### Architecture compliance (guardrails)

- **AD-11:** XSS-safe via React escaping; no `dangerouslySetInnerHTML`. **NFR-1:** optimistic ≤100 ms, reconcile ≤500 ms p95. **AD-8:** errors coded/voiced, never raw — reaffirm in the security doc. **AD-3:** keep the perf harness simple (no perf-tooling dependency; Playwright + `performance.now()` suffice). **AD-13:** these are E2E tests (part of the ≥5 suite floor) + QA reports.
- **Standing constraint:** never leak the Torgue voice into code/identifiers/logs — payload strings and doc prose stay plain.

### Learnings carried from earlier stories (apply them)

- **`data-testid` locators** decoupled from rotating copy (Epic-2 retro). **`page.waitForResponse`** to prove a server commit (Story 4.1). **Real-DB E2E** needs `DATABASE_URL` → the test compose profile / CI Postgres. **Adversarial review** will scrutinize whether the perf test actually measures what it claims (not Playwright overhead) and whether the XSS test truly proves inertness (not just "text present") — design for that.

### Latest tech information

- **React 19** auto-escapes text children and string attributes; JSX has no HTML-parsing path without `dangerouslySetInnerHTML`. An injected `<script>` in text never executes; an `<img onerror>` in text never becomes a real element.
- **Playwright**: `page.evaluate` for in-page timing; `page.waitForResponse(predicate)` for commit timing; `request.timing()` is available on a `Response` if finer network breakdown is wanted (optional).

### Project Structure Notes

- **NEW:** `tests/e2e/security.spec.ts`, `tests/e2e/performance.spec.ts`, `docs/qa/security-review.md`, `docs/qa/performance.md`.
- **PRESERVE:** all app/lib behaviour; the existing suites; the coverage gate.

### References

- [Source: planning-artifacts/epics.md#Story-4.3] ACs (XSS-inert task text, no `dangerouslySetInnerHTML`, AD-11; optimistic ≤100 ms + reconcile ≤500 ms p95, NFR-1; findings/remediations documented)
- [Source: planning-artifacts/epics.md] NFR-1 (line 46); AD-7 optimistic paradigm (line 64); AD-11 XSS-safety
- [Source: app/todo-app.tsx] task text render sites (`{entry.text}`, escaped `aria-label`); pending/`saving` testid
- [Source: lib/store/reducer.ts, lib/store/todo-store.tsx] the optimistic dispatch path (what "≤100 ms" measures)
- [Source: tests/e2e/persistence.spec.ts] the `waitForResponse` commit-timing pattern to reuse
- [Source: implementation-artifacts/deferred-work.md] timeout-after-success reconciliation residual to note (not fix)
- [Source: _bmad-output/project-context.md] optimistic-UI mandate; no new deps; AD-8 coded errors

## Senior Developer Review (AI)

**Date:** 2026-07-08 · **Outcome:** Approve (all patch findings fixed) · **Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor (adversarial, parallel).

All three confirmed both ACs are genuinely met (real XSS-inertness proof; both NFR-1 budgets measured + documented under `docs/qa/`; scope + standing constraints upheld) and that neither test false-passes. Findings were about a real skip bug + overstated rigor — fixed.

### Review Findings

- [x] **[Review][Patch] MED — The "chromium only" perf skip was a no-op** [tests/e2e/performance.spec.ts] — `test.skip(({ browserName }) => browserName !== "chromium")` never fired because BOTH Playwright projects use the chromium engine (Desktop Chrome + Pixel 7), so perf ran under mobile emulation too (the noise it meant to exclude, plus parallel DB contention). **Fixed:** skip in `beforeEach` on `testInfo.project.name !== "chromium"` (verified: mobile perf now skipped, chromium runs).
- [x] **[Review][Patch] MED — Reconcile "p95" at n=15 was just the max sample** [tests/e2e/performance.spec.ts] — `ceil(0.95×15)=15` → the single worst sample defined pass/fail; no warmup. **Fixed:** discard 5 warmup creates, measure 40, nearest-rank p95 now drops the top ~2 (real percentile, tolerates outliers). Re-measured: p95 ~70 ms (max ~140), n=40.
- [x] **[Review][Patch] LOW — Reconcile wall-clock included Playwright click overhead** [tests/e2e/performance.spec.ts] — (tried the network-timing API but it returned unusable values for most samples). **Resolved:** kept wall-clock and documented it as a **conservative upper bound** (includes minor harness overhead → true server round-trip is faster; can't false-pass). Doc updated.
- [x] **[Review][Patch] LOW — Security `__xss` baseline `undefined` couldn't detect a broken harness** [tests/e2e/security.spec.ts] — **Fixed:** baseline `false`, assert `toBe(false)` (a non-running init script now fails). Documented that the literal-text + no-injected-element assertions are the primary XSS guards; `__xss` corroborates.
- [x] **[Review][Doc] LOW — "painted" wording** [docs/qa/performance.md] — clarified the optimistic metric measures the optimistic **DOM update** (a close paint proxy), not literal paint.
- [x] **[Review][Note] The `<script>` payload's execution can't run via React text anyway** — acknowledged: inline-script-as-text never executes (HTML5), so `__xss` is corroborating; the `<img onerror>` vector + the element-count/literal-text assertions are the real proof. No code change needed beyond the baseline fix.

Post-fix gates: typecheck ✓, lint ✓, 156 Vitest (coverage 94.89%, gate exit 0), Playwright 84 passed + 2 skipped (mobile perf, by design).

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Security (AC #1):** confirmed no `dangerouslySetInnerHTML` in app/lib; XSS-inertness proven by `tests/e2e/security.spec.ts` for both `<script>` and `<img onerror>` vectors, including a real-DB round-trip in a fresh context. `window.__xss` never set.
- **Performance (AC #2):** `tests/e2e/performance.spec.ts` measures optimistic latency in-page (~13 ms, budget 100) and reconciliation p95 over 15 samples (~97 ms, budget 500) — both well within NFR-1. In-page measurement avoids Playwright's polling granularity; the transient pending row is awaited via an in-page marker, not a polled locator.
- **Docs:** `docs/qa/security-review.md` + `docs/qa/performance.md`.
- **No app/lib behaviour changes; no new dependencies.** Only new E2E specs + QA docs. The timeout-after-success reconciliation residual is noted (not fixed — out of scope).

### File List

- `tests/e2e/security.spec.ts` (NEW) — XSS-inert E2E (2 vectors, real-DB round-trip)
- `tests/e2e/performance.spec.ts` (NEW) — optimistic ≤100 ms (in-page) + reconcile p95 ≤500 ms
- `docs/qa/security-review.md` (NEW) — XSS security review report
- `docs/qa/performance.md` (NEW) — NFR-1 performance report

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-08 | Story 4.3 drafted (ready-for-dev): XSS-inert E2E (script/onerror payloads render as inert text, no `dangerouslySetInnerHTML`, AD-11) + performance E2E (in-page optimistic ≤100 ms; reconcile p95 ≤500 ms via `waitForResponse`, NFR-1) + QA reports `docs/qa/security-review.md` and `docs/qa/performance.md`. Measure-and-document: no app/lib changes, no new deps. |
| 2026-07-08 | Story 4.3 implemented → review: security.spec.ts (2 vectors, real-DB round-trip, inert) + performance.spec.ts (in-page optimistic ~13 ms; reconcile p95). Docs added. |
| 2026-07-08 | Code review (adversarial 3-layer) → **done**. Both ACs confirmed met, no false-passes. Fixed MED: the chromium-only skip was a no-op (both projects use the chromium engine) → skip by `testInfo.project.name`; p95 at n=15 was the max sample → warmup 5 + 40 samples (real percentile). Fixed LOW: reconcile documented as a conservative upper bound; security `__xss` baseline `false`+`toBe(false)`; "painted" wording. Post-fix: typecheck ✓, lint ✓, 156 Vitest (94.89%), 84 Playwright + 2 skipped. Measured: optimistic ~15–30 ms, reconcile p95 ~70 ms — both well within NFR-1. |
