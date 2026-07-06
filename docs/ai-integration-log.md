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

## MCP servers used
- _TBD._ Assignment targets **Postman MCP** (API contract validation), **Chrome DevTools MCP** (perf/debug), **Playwright MCP** (E2E automation). Not yet wired into this session — to be set up before implementation/QA phases.

## Limitations encountered
- _Running list._ So far: AI needs an explicit human boundary when a stylistic instruction ("in the voice of X") could apply either to the product or to the deliverables — it guessed wrong until corrected.

## Test generation (AI)
- _TBD in Phase 2._

## Debugging with AI
- _TBD in Phase 2._
