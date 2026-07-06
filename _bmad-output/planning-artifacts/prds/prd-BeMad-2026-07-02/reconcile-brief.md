# Input Reconciliation — Brief → PRD

**Input:** Product Brief "BeMad — Todo App" (`briefs/brief-BeMad-2026-07-02/brief.md` + `addendum.md`)
**Target:** `prds/prd-BeMad-2026-07-02/prd.md` + `addendum.md`
**Date:** 2026-07-02

## Method
Walked every brief section (Executive Summary, Problem, Solution, Differentiator, Users, Success Criteria, Scope in/out, NFRs, Vision) and the full addendum (original spec, Voice & Copy Guide §2, Architecture-Enabling Notes §3, Resolved/Open Decisions §4). Focused on qualitative intent (tone, voice, delight, clarity rule, accessibility) that an FR list can silently flatten.

## What landed well (coverage confirmed)
- **Core loop** create/view/edit-in-place/toggle-complete/delete → FR-1..FR-6. Toggle bi-directionality (§4 resolved) explicitly captured in FR-4.
- **In-place editing is v1** (the addendum's headline "don't miss it" decision) → FR-3. Not dropped.
- **Metadata / creation time** → FR-7 + Todo entity.
- **Optimistic/instant UI + rollback** → FR-10, NFR-1.
- **Empty / loading / error states, all voiced** → FR-11.
- **Responsive desktop + mobile** → FR-12, NFR-5.
- **Durable server-side persistence (not localStorage-only)** → FR-19 + PRD addendum data-access-module note. Addendum §3 durability intent preserved.
- **Small well-defined CRUD API** → FR-20.
- **Voice pack centralized / swappable / one pack (Torgue) in v1** → FR-13, and scope "out" keeps multiple voices out while leaving the door open.
- **~5 semantically identical variants per key** → FR-14.
- **Rotation: per-surface on load, re-roll interactive controls per interaction, no back-to-back repeat** → FR-15. Faithful to §2/§3.
- **Bleeped profanity** → FR-16.
- **Clarity rule (humor never obscures function)** → FR-17 + counter-metric + goal statement "without sacrificing clarity."
- **Accessibility: ALL-CAPS via CSS text-transform not stored strings; stable descriptive aria-label while visible text rotates** → FR-18 + NFR-4. This qualitative rule survived intact.
- **Zero-onboarding usability, persistence stability, perceived-instant, delight** → Success Metrics all mapped.
- **Forward-compat for auth/multi-user (owner concept), auth not built** → NFR-6 + PRD addendum.
- **NFRs simplicity/performance/maintainability/resilience** → NFR-1..NFR-3.
- **Deterministic-testable rotation selector (no Math.random in components, inject seed)** → PRD addendum. Good — this operationalizes §3 without over-specifying in the PRD body.

## Gaps / weakenings / contradictions

### 1. "Quiet aside" Torgue beat is dropped (qualitative voice detail)
Brief addendum §2 lists a specific voice characteristic: *"Occasional brief 'quiet aside' in lowercase before returning to shouting (a canonical Torgue beat) — use sparingly."* This is echoed only implicitly in the variant examples (the delete-cancel options `uh, nevermind` / `wait, no`). The PRD abstracts voice to "authentically Torgue" (FR-13/14) and points to the guide, but the lowercase-aside beat is a distinctive, easy-to-lose flavor rule. Because the PRD explicitly says voice detail is *not duplicated* and lives in the brief addendum (PRD addendum "Voice & copy"), it is technically referenced — but nothing in the PRD flags this as a must-keep, so it could be silently lost by an implementer who only reads FRs. **Weakened, not fully dropped.**

### 2. "It never gets stale" / never-feels-static intent is implicit only
Brief's differentiator #2 ("It never gets stale. Repeat users keep getting fresh lines — humor doesn't wear out") and Solution's "the app never feels static" are the *purpose* of rotation. The PRD encodes the mechanism (FR-15) and a delight metric ("repeat use surfaces fresh variants") but does not restate the intent that rotation exists to prevent staleness. Minor — the metric mostly covers it.

### 3. Success criterion "actually *wanting* to open the app" not carried as a metric
Brief "Who This Serves" success framing: *"actually wanting to open the app."* This aspirational delight signal is not represented in Success Metrics (which cover zero-guidance, persistence, instant, and "delight lands"). The "delight lands" metric is adjacent but narrower (voice reads as Torgue + fresh variants) and is qualified "qualitative for a demo." Minor softening of the emotional-pull ambition.

### 4. Server-side error handling scope may be under-specified vs brief
Brief and original spec both call for *"basic error handling both client-side and server-side."* PRD FR-10 covers client-side optimistic rollback + voiced errors; NFR-2 covers "graceful client- and server-side error handling." Server-side handling is present in NFR-2 but has no dedicated FR — it lives only as an NFR. Not missing, but lighter-touch than the brief's explicit both-sides framing. Low severity.

## Items the PRD ADDED beyond the brief (not gaps, flagged for awareness)
These are net-new requirements not in the brief; confirm they are intended, not scope creep:
- **FR-8 sort options** (newest/oldest/alphabetical/active-before-completed) — the brief explicitly lists "search, or filtering" as OUT of v1 and says nothing about sorting. Sorting is distinct from filtering, but this is a genuinely new capability the brief did not request. **Worth an explicit confirm.**
- **FR-9 validation** (reject empty/whitespace, 1000-char cap) — sensible, but the specific 1000-char limit and the Todo entity's `≤1000 chars` are PRD inventions, not in the brief.
- **FR-5 delete requires confirmation** — the brief lists delete but does not mandate a confirmation step; the addendum's variant examples include a delete-confirmation message, so this is well-grounded, just slightly firmer than the brief's plain "delete a todo."
- **Perceived-instant target `<100ms`** — flagged `[ASSUMPTION]` in the PRD, which is appropriate.

## Bottom line
No core capability from the brief is missing or contradicted; the mapping is strong. The qualitative risks are (a) the lowercase "quiet aside" Torgue beat being referenced-but-not-flagged and thus loseable, and (b) the emotional "want to open it" / anti-staleness intent being softened to mechanism + one qualitative metric. Separately, FR-8 (sort) is a genuine PRD addition not requested by the brief and deserves a confirm.
