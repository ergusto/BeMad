# AI Integration Log — BeMad

A running record of how AI agents (Claude Code + BMAD skills) and MCP servers were used to build BeMad, including what worked, what AI missed, and where human judgment was decisive. Maintained throughout the project per the assignment.

---

## How BMAD guided the work

BeMad follows the **BMAD Method** pipeline: `brief → project-context → PRD → architecture → epics/stories → sprint → dev (with QA integrated) → retro`. Each phase is a dedicated skill run in its own context, with a `.memlog.md` audit trail and adversarial review gates. This log complements those per-phase memlogs with a cross-cutting AI/MCP view.

---

## Phase 1 — Planning (complete)

### Product Brief — `bmad-product-brief`
- **AI assistance:** facilitated the brief from a raw spec; drafted brief + addendum.
- **Prompts that worked:** giving the full spec up front, then answering targeted assumption questions. Clarifying the *scope* of the Mr. Torgue voice ("app copy only, not the docs/code") mid-run prevented a large misdirection.
- **AI miss / human-critical:** the model initially applied the Torgue voice to the *brief itself*; the human correction ("voice is a product feature, not the documentation") was decisive.
- **Review:** 4 parallel editorial subagents (structure + prose × brief + addendum).

### Project Context — `bmad-generate-project-context`
- **AI assistance:** authored `project-context.md` (conventions all downstream agents auto-load) from stated preferences, since greenfield had no code to scan.
- **Human-critical:** the requirement that every user-facing string has ~5 rotating variants, and the voice-scope boundary, came from the human.

### PRD — `bmad-prd`
- **AI assistance:** drafted the full PRD (22 FRs, 6 NFRs, glossary, journey) from brief + project-context via Fast path.
- **Review (5 parallel subagents):** brief-reconcile, context-reconcile, PRD quality rubric, adversarial completeness, and a **web-backed tech reality-check** (confirmed Next.js v16 / App Router stable, Vitest v4, Playwright current).
- **AI miss the review caught:** after renumbering FRs, the addendum's cross-references went stale (all pointed to wrong FRs) — caught by 3 independent reviewers. Also flagged: rotation "on each interaction" was underspecified for the checkbox/text input, and the perceived-instant metric lacked a testable bound. All fixed.
- **Human-critical:** resolving open questions (user-selectable sort, 1000-char limit, reject whitespace).

### Key architecture-shaping decisions (human)
- **Topology:** unified Next.js app (API routes), one app service. (Grading note: "Dockerfiles for frontend and backend" is satisfied by one multi-stage app Dockerfile — FE+API in one Next.js service — plus a Postgres service; compose still orchestrates a real multi-container stack.)
- **Persistence:** containerized **Postgres** (satisfies durability + Docker multi-service requirement).

### Architecture — `bmad-architecture`
- **AI assistance:** distilled a 14-decision architecture spine (AD-1…AD-14) + a readable `ARCHITECTURE.md` from the PRD + project-context, Fast path.
- **Reviewer gate (4 parallel subagents + mechanical lint):** lint clean; good-spine rubric PASS; **web-backed version check corrected Node 22→24 LTS and Postgres 17→18** (AI's training-based versions were stale — human/web verification was decisive); adversarial "make two conforming builders diverge" attack found a **critical gap** (no single owner of client todo state → added AD-14) plus ownership seams now tightened into AD-4/5/7/8/9.
- **AI miss the gate caught:** the first spine draft left FR-18 (bleeping), FR-19 (clarity), and the NFR-1 latency budgets with no governing AD; and mis-routed the three UI states to the rollback AD. All closed.
- **Human-critical:** topology + database decisions; catching that we'd skipped the PRD gate.

---

## Phase 2 — Implementation & QA (complete)

Implementation ran as a **story-by-story loop**, one story per commit, each story taken through the same pipeline:

> `create-story` (context engine) → `dev-story` (red-green implementation) → `bmad-tea automate` (guardrail-test expansion, where applicable) → **adversarial `code-review`** → apply fixes → commit.

Epics 1–4 (18 stories + retrospectives) were delivered this way. See `_bmad-output/implementation-artifacts/sprint-status.yaml` for the ledger and the per-story files for each story's Dev + Review record.

### What worked
- **The story-context engine** front-loaded architecture guardrails (AD-1…AD-14), file lists, and prior-story learnings into each story file, so `dev-story` rarely picked the wrong library, file, or pattern.
- **Red-green discipline** (write failing tests first) plus a **single client store with a pure reducer** made most logic node-unit-testable without a React harness.
- **Per-story commits** (an Epic-1 retro action item) kept the history bisectable and each change reviewable in isolation.
- **Retro action-items fed the next epic** — e.g. the Epic-2 decision to locate E2E by `data-testid` (decoupled from rotating copy) prevented a whole class of flaky selectors in Epic 3.

### The adversarial review earned its keep (AI catching AI)
A 3-layer parallel review (Blind Hunter — diff only; Edge Case Hunter — diff + repo; Acceptance Auditor — diff + spec) ran on every story and caught a **real, often self-introduced defect in nearly every one**, e.g.:
- **Story 2.2:** delete-rollback restored the row at a stale absolute index → corrupted ordering under interleaved ops (fixed with an order-snapshot).
- **Story 3.1:** the profanity bleep missed inflected forms (regex boundary).
- **Story 3.2/3.3:** per-surface reroll bug; an unwired `appTitle`.
- **Story 4.1:** persistence E2E raced optimistic UI vs. the server commit (asserted before the POST/DELETE committed) → added `waitForResponse`.
- **Story 4.2:** the coverage gate silently **excluded the store reducer** (it lived in a `.tsx` file caught by the `**/*.tsx` exclusion) while the QA doc claimed it was counted → extracted the pure reducer to `lib/store/reducer.ts` so it's genuinely gated.
- **Story 4.3:** a "chromium-only" perf skip was a **no-op** (both Playwright projects use the chromium engine) so perf ran under mobile emulation too; and a "p95" over 15 samples was just the max sample → fixed the skip (by project name) and added warmup + 40 samples.

**Lesson recorded across retros:** *passing tests ≠ correct.* The adversarial pass, run in fresh context, repeatedly found defects the implementing agent was confident about.

### AI misses vs. human-decisive calls
- **AI-decisive (with review):** most implementation, test authoring, the reducer/optimistic state machine, the voice rotation, the QA harnesses.
- **Human-decisive:** scope boundaries (voice in-app only, never in docs/code/logs), the commit-when-asked / never-push-unattended guardrails, resolving WCAG 2.5.3 (stable accessible names vs. rotating voice) as a documented trade-off, and repeatedly choosing *not* to smuggle app-behaviour changes into measure-and-document stories.

## MCP servers used
- **Honest status:** MCP servers were **not** materially used to build the app. E2E automation ran via the **Playwright CLI/test runner** (not the Playwright MCP); `context7` was available for library-doc lookups. The assignment named Postman MCP (API contract validation) and Chrome DevTools MCP (perf/debug) as options — these were **not wired** for this build. Performance was measured with Playwright + the in-page `performance` API instead (see `docs/qa/performance.md`); API behaviour was validated by the integration + E2E suites rather than a Postman collection.

## Limitations encountered
- AI needs an explicit human boundary when a stylistic instruction ("in the voice of X") could apply to the product or the deliverables — it guessed wrong until corrected.
- **Training-data staleness on versions:** the model proposed stale runtimes (Node 22, Postgres 17) until web/human verification corrected them to Node 24 LTS / Postgres 18.
- **Over-confidence in its own tests:** implementing agents marked stories "done" with green suites that the adversarial review then showed were testing the wrong thing (tautological assertions, races, mis-scoped gates). The review gate — not the implementer — was the reliable correctness signal.
- **Flaky E2E** under real-DB parallelism required deliberate mitigations (unique text, `waitForResponse`, `toBeVisible` waits, `data-testid` locators).

## Test generation (AI)
- Unit + integration tests were written red-first during `dev-story`; `bmad-tea automate` expanded guardrail coverage where a story added runtime surface. The Playwright suite grew to 15 spec files / 84 tests (41 per project × 2, plus a chromium-only perf spec) covering journeys, optimistic rollback, sort, voice, accessibility (axe), XSS-inertness, and performance. The coverage gate (`npm run test:coverage`, ≥85% logic-layer) enforces the floor. AI-authored tests were repeatedly strengthened by review (e.g. non-identity fixtures, commit-proving waits, real percentiles).

## Debugging with AI
- Failures were diagnosed from test output + targeted file reads, then fixed within the same loop. Representative fixes: the delete-rollback ordering bug (reasoned from a failing reducer test), the persistence-test race (traced to optimistic-vs-commit timing), the coverage-scope gap (found by cross-referencing the HTML report against the source tree), and the no-op perf skip (found by checking `devices["Pixel 7"].defaultBrowserType`). Web/doc verification (context7 + web) was decisive for version and API-shape questions.
