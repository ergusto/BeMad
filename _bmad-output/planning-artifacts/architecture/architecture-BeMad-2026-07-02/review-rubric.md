# Rubric Walker Review — ARCHITECTURE-SPINE.md (BeMad)

**Reviewer:** Good-Spine Rubric Walker (finalize gate, Validate posture — report only, no edits)
**Target:** `_bmad-output/planning-artifacts/architecture/architecture-BeMad-2026-07-02/ARCHITECTURE-SPINE.md`
**Standard:** good-spine checklist, calibrated to a feature-altitude spine for a small unified Next.js + Postgres single-user todo app. Not judged against platform-scale rigor.

## Gate verdict

**PASS.** This is a genuinely right-sized spine. The deterministic lint pass is clean (0 findings), all 13 ADs are true invariants carrying enforceable Binds/Prevents/Rule, every structural dimension the altitude owns is decided, the seed is minimal, and both diagrams are valid and load-bearing. Findings below are polish, not blockers — no critical or high issues.

## Deterministic pass

`lint_spine.py --workspace ...` → `{ "ok": true, "total_findings": 0 }`. No placeholders, duplicate AD IDs, missing Binds/Prevents/Rule, or unpinned stack versions. (Ran with `python3`; `uv` not on PATH.)

## Version currency (verified-current check)

- **Next.js 16.x** — current stable is 16.2.9 LTS (June 2026). ✅ correct.
- **Vitest 4.x** — current stable is 4.1.9 (v5 still beta). ✅ correct.
- **PostgreSQL 17.x, Node 22 LTS** — plausible current-stable targets; the spine explicitly defers exact pinning to scaffold "verify latest stable", which is the right discipline at feature altitude.

No stale or hallucinated versions. The "verify latest stable and pin at scaffold" note is good practice and matches `project-context.md` version discipline.

## Are the ADs true invariants? (not obvious, not rationale)

Checked each AD for the failure modes: (a) restating an obvious default, (b) being a rationale/goal rather than an enforceable rule, (c) not actually preventing its stated divergence.

- **AD-1 Layered dependency direction** — invariant. Direction + the specific "UI never imports the DB client/repository, only repository imports DB client" is a real, checkable divergence point (many teams leak DB access into components/server actions). Not obvious. ✅
- **AD-2 Single data-access repository** — invariant. "No SQL or DB client outside `lib/db`" is enforceable and prevents two owners of the store. ✅
- **AD-3 Postgres is system of record** — invariant. Rules out client-only/ephemeral state, directly answers the PRD's one open question (FR-21, "not serverless-ephemeral"). ✅
- **AD-4 REST API contract** — invariant. Pins verbs, routes, success/error shapes, status codes. Prevents ad-hoc endpoint shapes. ✅
- **AD-5 Shared Todo schema single source of truth** — invariant. One Zod/TS type imported everywhere; prevents client/server drift. ✅
- **AD-6 Server-authoritative validation** — invariant, and correctly the *authority* half of FR-9 (client may mirror, is never authority). Not redundant with AD-5: AD-5 is shape, AD-6 is who enforces. ✅
- **AD-7 Optimistic mutation with rollback** — invariant. Binds the per-operation rollback rules (FR-10) and the non-persisted-task guard (FR-11) into one strategy so client code can't diverge. ✅
- **AD-8 Voice pack + voice-scope boundary** — invariant. "No hardcoded user-facing string" + "voice confined to user-facing copy, never API/codes/logs" is a real, frequently-violated boundary. ✅
- **AD-9 Deterministic rotation selector** — invariant. Pure `(key, lastShownIndex, rng) → variant` with injected RNG, no-repeat + reachability. Makes FR-16/17 testable; prevents scattered `Math.random()`. Strong AD. ✅
- **AD-10 Accessibility contract** — invariant. CSS `text-transform` not stored caps, stable accessible names under rotating labels, rotation never touches state-conveying text. Concrete and checkable. ✅
- **AD-11 XSS-safe rendering** — invariant. "Store raw, render via React escaping, `dangerouslySetInnerHTML` forbidden for user content." Small but load-bearing security invariant. ✅
- **AD-12 Docker Compose deployment** — invariant *and* the operational-envelope dimension the rubric specifically warns domain-focused drafts skip. Present and detailed (multi-stage, non-root, HEALTHCHECK, profiles, `/api/health`). ✅
- **AD-13 Test strategy floor** — borderline but acceptable. It reads partly as a QA plan rather than a pure architectural invariant, but the load-bearing parts (repository tested against a *real* test Postgres, ≥5 named E2E paths, axe-core in Playwright, 70% floor) are enforceable structural commitments that keep stories consistent. Kept as-is; see finding L-1.

No AD is a bare restatement of a framework default, and none is pure rationale. This is the part most feature spines get wrong; this one holds up.

## Structural dimensions — is any owned dimension silent?

- **Operational/environmental envelope** — covered (AD-12: deployment, environments via profiles, health, infra provider = Docker Compose). This is the dimension the rubric flags most often; not silent here.
- **Data ownership** — covered (AD-2 single repository owner, AD-3 system of record, ER diagram, naming/mapping conventions).
- **State mutation** — covered (AD-7 optimistic + rollback + non-persisted guard; conventions "server owns truth").
- **Contract/interface** — covered (AD-4 REST, AD-5 shared schema).
- **Validation/authority** — covered (AD-6).
- **Security** — covered proportionally (AD-11 XSS; auth explicitly deferred per NFR-6 with an `owner` seam left in schema).
- **Accessibility** — covered (AD-10).
- **Cross-cutting conventions** — naming, data/formats, logging, config-via-env all in the conventions table.

No owned dimension is left silent. Deferred items (auth, migration-tool specifics, multi-voice, CI) are each scoped with a reason and, where relevant, note the seam that keeps them from letting units diverge later. Nothing under Deferred could let two units diverge today.

## Diagrams — valid and load-bearing?

- **Paradigm graph (`graph TD`)** — valid Mermaid. Load-bearing: it *is* the visual of AD-1's dependency direction, and the `VOICE -.copy.-> UI` dotted edge correctly shows voice as a copy dependency of UI, not a layer in the data flow. Matches the directory mapping prose. ✅
- **ER diagram (`erDiagram`)** — valid Mermaid. Load-bearing: it is the concrete shape behind AD-5 and the PRD's core Todo entity (`id`, `text`, `completed`, `created_at`). ✅

Both render and both carry weight; neither is decorative.

## Seed minimality

The Structural Seed is minimal and correct for the altitude: a single directory tree plus the two files ops needs (Dockerfile, compose). It does not scaffold speculative folders, does not over-specify file contents, and each entry maps to an AD or FR. `tests/unit|integration|e2e` matches AD-13. Not over-seeded. ✅

## Spec coverage

Cross-checked against `prd.md`. All FR-1..FR-22 and NFR-1..NFR-6 land somewhere in the Capability→Architecture Map and trace to at least one AD. The PRD's single Open Question (persistence mechanism, must be durable / not serverless-ephemeral) is resolved by AD-3 + AD-12 (containerized Postgres, non-serverless). FR-8 sort is correctly placed as pure client concern under AD-1. No capability is orphaned.

## Findings (tiered)

### Critical
None.

### High
None.

### Medium
None.

### Low / polish

- **L-1 — AD-13 is a plan wearing an invariant's clothes.** Coverage % and the E2E count read as a QA test-design deliverable rather than an architectural invariant. It is defensible to keep (the real-Postgres and axe-in-Playwright commitments *are* structural), but consider whether the 70% number and the "≥5" enumeration belong here versus the test-design/QA artifact — at feature altitude having them in the spine is fine; flagging only so it's a conscious choice, not drift.
- **L-2 — `created_at` only, no `updated_at`.** FR-3 (edit in place) and FR-4 (toggle) mutate rows, and FR-7 deliberately scopes metadata to creation timestamp only, so this is intentional and correct — but note the ER diagram / schema will need a conscious "no updated_at" decision at scaffold so a developer doesn't add one reflexively. Not a spine defect; a scaffold-time note.
- **L-3 — Drizzle ORM carries `[ASSUMPTION]`.** Correctly marked, and the repository port (AD-2) makes it swappable, so the assumption is low-risk and well-contained. No action needed; noted for transparency. The Deferred entry on migration tooling (Drizzle Kit vs plain SQL) sensibly leaves that open.
- **L-4 — `sources` front-matter path.** `sources: ['prd-BeMad-2026-07-02/prd.md', ...]` is a relative slug; the actual PRD lives under `prds/prd-BeMad-2026-07-02/prd.md`. Cosmetic — traceability is intact — but the path prefix differs from the on-disk location.

## Summary line for parent

PASS — right-sized feature spine; 13 ADs are all true, enforceable invariants; operational/data/state dimensions all covered; diagrams valid and load-bearing; versions verified-current; only 4 low/polish notes, no blockers.
