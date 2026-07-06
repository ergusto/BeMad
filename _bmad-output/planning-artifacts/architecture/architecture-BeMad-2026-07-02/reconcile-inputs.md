# Input Reconciliation — Architecture Spine (BeMad)

**Finalize-step check:** does `ARCHITECTURE-SPINE.md` honor its two load-bearing inputs?
**Inputs:** (1) PRD `prd-BeMad-2026-07-02/prd.md` + `addendum.md`; (2) `project-context.md`.
**Date:** 2026-07-02. Method: mapped every FR/NFR and every project-context rule to a governing AD, map row, convention, or stack entry; flagged anything with no home, contradicted, or softened — with attention to qualitative requirements the AD structure tends to drop.

---

## Input 1 — PRD (+ addendum)

### FR / NFR coverage matrix

| Req | Governed by (spine) | Status |
| --- | --- | --- |
| FR-1 create | AD-11, AD-1/2/4/5 (map) | Covered |
| FR-2 view list | AD-1/2/4/5 (map) | Covered |
| FR-3 edit in place | AD-11, map FR-1–7 | Covered |
| FR-4 toggle | map FR-1–7 | Covered |
| FR-5 delete + confirmation | map FR-1–7; confirm dialog in AD-10, AD-13 (E2E) | Covered |
| FR-6 completed visually distinct | map FR-1–7 (UI) only — no AD | **Weak** |
| FR-7 createdAt metadata | Conventions (ISO-8601 `createdAt`), ER diagram | Covered |
| FR-8 sort options | map FR-8 → AD-1 | Covered (client) |
| FR-9 validation both sides / 1000 code points | AD-6 (explicit) | Covered |
| FR-10 optimistic + per-op rollback | AD-7 (explicit) | Covered |
| FR-11 non-persisted task non-mutable | AD-7 (explicit) | Covered |
| FR-12 distinct empty/loading/error states | map FR-10–13 → AD-7 | **Gap** |
| FR-13 responsive desktop/mobile | map FR-10–13 → AD-7 | **Gap** |
| FR-14 centralized voice pack; "never feels static" | AD-8 | Partly (see qualitative) |
| FR-15 ~5 variants/key | AD-8 | Covered |
| FR-16 rotation rules (a–d) | AD-9 | Partly (see below) |
| FR-17 rotation never alters state text | AD-10 (explicit) | Covered |
| FR-18 profanity bleeped | map FR-18–20 → AD-8/10 | **Gap** |
| FR-19 clarity rule (humor never obscures function) | map FR-18–20 → AD-8/10 | **Gap** (qualitative) |
| FR-20 ALL-CAPS via styling + stable aria | AD-10 (explicit) | Covered |
| FR-21 durable server-side persistence | AD-3 | Covered |
| FR-22 API CRUD consistent shapes/status | AD-4 | Covered |
| NFR-1 perf ≤100 ms UI / ≤500 ms p95 reconcile | map NFR → AD-7 | **Gap** (numbers dropped) |
| NFR-2 reliability / no silent data loss | AD-7 + AD-3 | Covered |
| NFR-3 simplicity / no premature abstraction | not an invariant; implied by Deferred | **Weak** |
| NFR-4 accessibility | AD-10 | Covered |
| NFR-5 compatibility (evergreen browsers) | — | **Gap** |
| NFR-6 forward-compat (`owner`) | Conventions + Deferred | Covered |

### What did NOT land (PRD)

1. **FR-18 profanity bleeping has no governing rule.** No AD mentions bleeping profanity (`F***`). It is a hard, testable content rule and sits inside the voice-scope domain (AD-8) but is never stated there. It could be dropped silently at build time. This is the clearest true gap.

2. **FR-19 clarity rule — qualitative, dropped.** "Every variant unambiguously conveys the action; humor never obscures function" is a load-bearing counter-metric (voice must never reduce task-completion success). No AD encodes it; the map points FR-19 at AD-8/AD-10, neither of which states it. This is exactly the kind of qualitative requirement (delight vs. clarity tension) the AD structure tends to lose. It is also unenforced in AD-13's test floor.

3. **FR-12 distinct empty/loading/error states — under-governed.** The map routes FR-12 to AD-7, but AD-7 is about optimistic mutation/rollback, not the three-state UI. The requirement that all three states exist and each uses voice-pack copy has no invariant; only the E2E floor (AD-13) mentions "empty state" and "error/rollback" — loading state is not asserted, and "distinct states" as a UI contract is absent.

4. **NFR-1 performance budgets dropped.** The concrete numbers — UI reflects in ≤100 ms, reconciliation ≤500 ms p95 — appear nowhere in the spine. AD-7 gives the mechanism (optimistic + reconcile) but not the budget. The perceived-instant success metric therefore has no architectural anchor and no test/measurement hook in AD-13.

5. **FR-13 responsive + NFR-5 compatibility — no home.** Responsive desktop/mobile (FR-13) and evergreen-browser compatibility (NFR-5) are not bound by any AD, convention, or stack entry, and are absent from the test floor. Minor for a spine (largely a UI/CSS concern), but currently invisible.

### Qualitative / delight requirements — verdict
- **"never feels static"** (FR-14, and the "Delight lands" success metric): partially honored — AD-8 mandates ~5 variants and AD-9 guarantees no back-to-back repeat + all variants reachable, which is the mechanism behind freshness. The *intent* (delight, authentic Torgue voice) is not stated but the mechanism is sound.
- **clarity beats comedy** (FR-19): NOT carried — see gap 2.
- **voice reads as authentically Torgue**: a demo-qualitative metric; reasonably out of scope for a spine, no action needed.

### Minor / not gaps
- FR-16 rotation *specifics* (which surfaces re-roll, checkbox/text-input excluded from rotation) live in the FR, not in AD-9. AD-9 correctly captures the invariant (pure injected-RNG selector, no repeat, all reachable); the per-surface policy is legitimately a component-level detail. Acceptable, but the exclusions (FR-16d) are worth a design note so they aren't lost.
- FR-6 "visually distinct" is a pure styling concern; leaving it to the client layer is defensible. Flagged as weak, not a gap.

---

## Input 2 — project-context.md

Every locked project-context rule was checked for contradiction or omission.

| project-context rule | Spine treatment | Status |
| --- | --- | --- |
| TypeScript strict, no `any` | Stack: "TypeScript (strict)" | Covered (no explicit "no `any`" / `noUncheckedIndexedAccess`) |
| Next.js App Router + React | Paradigm, Stack | Covered |
| Route Handlers ARE the API; no separate backend | AD-4, paradigm (unified Next.js app) | Covered |
| Vitest + Playwright | AD-13, Stack | Covered |
| Persistence undecided → single data-access module, swappable | AD-2 (single repository), AD-3 | Covered (context said undecided; spine correctly *decides* Postgres — expected at architecture stage) |
| Pin exact versions at scaffold; don't invent versions | Stack note + "verify latest stable and pin" | Covered |
| Voice pack: one module, no hardcoded strings | AD-8 | Covered |
| ~5 variants/key, all mean the same | AD-8 | Covered |
| Rotation: per-surface on load, controls re-roll, no back-to-back repeat | AD-9 | Covered |
| Voice scope = user-facing copy ONLY (code/logs/API/error codes/docs plain) | AD-8 (explicit voice-scope boundary) + Conventions | Covered |
| Profanity bleeped | — | **Omitted** (mirrors FR-18 gap) |
| Clarity beats comedy | — | **Omitted** (mirrors FR-19 gap) |
| A11y: CSS caps, stable aria | AD-10 | Covered |
| One shared `Todo` type, defined once, imported both sides | AD-5 | Covered |
| ES modules + path aliases, no deep relative chains | — | **Omitted** (minor) |
| Errors handled at explicit boundaries (API + client mutation) | AD-4 (error shape) + AD-7 (voiced retryable error) | Covered |
| Server Components by default; `'use client'` only where needed | Structural seed comment only | Weak/implicit |
| CRUD → HTTP verbs, consistent JSON + status | AD-4 | Covered |
| Optimistic UI + rollback + voiced error | AD-7 | Covered |
| Empty/loading/error as first-class, all voice-pack | map FR-12 → AD-7 | **Gap** (mirrors FR-12) |
| Rotation selector deterministic-testable, inject seed, no `Math.random()` | AD-9 (explicit: injected RNG) + AD-13 | Covered |
| E2E covers create/edit/toggle/delete-confirm/empty-loading-error | AD-13 (≥5 listed) | Covered — but **loading state not in the E2E list** |
| Persistence durability is a *tested* requirement (survives reload/new session) | AD-3 (durable) | **Gap** — durability is asserted architecturally but the spine's test floor (AD-13) does NOT list a reload/new-session persistence E2E |
| Files kebab-case / components PascalCase / vars camelCase | Conventions | Covered |
| Lint guard: reject literal user-facing strings in JSX | AD-8 (rule) but no lint-guard mechanism | Weak (rule present, enforcement not) |
| Bias to simplicity, no premature abstraction | Deferred section (restraint) | Weak (not an invariant) |
| git not initialized → initialize; Conventional Commits; plain commit msgs | — | **Omitted** (workflow — arguably out of spine scope) |
| No time estimates | n/a | n/a |
| Don't hardcode single-user; leave room for `owner`; don't build auth v1 | Conventions + Deferred | Covered |
| Don't assume a DB; route through data-access module | AD-2 | Covered (Postgres now chosen, still behind repository) |
| Durable server-side, not localStorage-only | AD-3 | Covered |
| Never leak Torgue voice into code/logs/API/comments | AD-8 + Conventions (structured logs plain) | Covered |
| Never break a11y with stored caps / rotating aria | AD-10 | Covered |

### What the spine contradicts or omits (project-context)
- **No contradictions found.** Where project-context said "persistence undecided," the spine deciding Postgres is the intended behavior of the architecture stage, not a violation.
- **Omissions:** profanity bleeping and clarity rule (same two as PRD — the strongest); persistence-durability as a *tested* requirement is asserted but not reflected in the AD-13 E2E list; loading-state E2E not enumerated; lint-guard against literal JSX strings named as a rule (AD-8) but no enforcement mechanism; ES-modules/path-alias and git-init/commit conventions absent (minor / arguably out of spine altitude).

---

## Folded-in assignment requirements — confirmation

| Requirement | Where in spine | Verdict |
| --- | --- | --- |
| Health endpoint | AD-12 + Structural seed (`GET /api/health` verifies DB connectivity); Dockerfile `HEALTHCHECK` | Covered |
| WCAG 2.2 AA | AD-10 ("Target: WCAG 2.2 AA, zero critical violations"); axe-core in AD-13 | Covered |
| ≥70% coverage | AD-13 ("Minimum 70% meaningful coverage") | Covered |
| ≥5 E2E | AD-13 lists 6: create, edit, toggle-complete, delete-with-confirm, empty state, error/rollback | Covered (count met) |
| XSS / security | AD-11 (raw store + React escaping, `dangerouslySetInnerHTML` forbidden); AD-6 server validation | Covered |
| Docker compose w/ dev+test profiles | AD-12 (multi-stage non-root Dockerfile, `docker-compose.yml` app+db, named volume, per-service health, `.env` + profiles `dev`/`test`) | Covered |

All six folded-in requirements are present and explicitly bound. One caveat: the ≥5 E2E list does **not** include a loading-state test or a persistence-durability (reload/new-session) test, both of which project-context calls for — see gaps above. The count floor is met; the required *scenarios* are slightly under-enumerated.

---

## Summary of material gaps (priority order)
1. **FR-18 profanity bleeping** — no governing rule anywhere. (hard content rule dropped)
2. **FR-19 / clarity-beats-comedy** — qualitative counter-metric not encoded in any AD. (delight-vs-clarity requirement dropped)
3. **NFR-1 performance budgets** (≤100 ms / ≤500 ms p95) — mechanism kept, numbers dropped; no measurement hook.
4. **FR-12 three distinct states** + **persistence-durability E2E** + **loading-state E2E** — under-governed / missing from the AD-13 test floor.
5. **FR-13 responsive / NFR-5 compatibility** — no home in any AD/convention (minor, UI-layer).

No contradictions of project-context. Folded-in requirements all covered.
