# Input Reconciliation — project-context.md vs PRD (+ addendum)

**Source input:** `/Users/ergusto/Projects/NearForm/BeMad/_bmad-output/project-context.md`
**Target:** `prd.md` and `addendum.md` in `prd-BeMad-2026-07-02/`
**Date:** 2026-07-02

## Method
Checked each project-context.md rule for (a) contradictions in the PRD and (b) capability implications the PRD should surface. Per instructions, the deliberate separation of tech-how (stack, persistence choice, seed-injection detail) into project-context is NOT treated as a gap.

## Coverage — project-context rules that ARE properly reflected as PRD capabilities

| project-context rule | PRD capability | OK |
|---|---|---|
| Optimistic UI + rollback + voiced error (FW rules) | FR-10, NFR-1/NFR-2 | ✅ |
| Deterministic-testable rotation, no back-to-back repeat, all variants reachable | FR-15 (no-repeat capability); seed-injection correctly deferred to addendum/architecture | ✅ (see F2) |
| Durable server-side persistence, not localStorage | FR-19, NFR-2, Success metric "Persistence stability", Open Q | ✅ |
| Forward-compat `owner` concept, no auth in v1 | NFR-6, Scope Out, addendum "Forward-compatibility" | ✅ |
| Voice scope = user-facing copy ONLY (never in code/logs/API/comments) | see F1 | ⚠️ partial |
| Centralized voice pack, no hardcoded strings | FR-13 | ✅ |
| ~5 variants per key, semantically identical | FR-14 | ✅ |
| Profanity bleeped | FR-16 | ✅ |
| Clarity beats comedy | FR-17, Counter-metrics | ✅ |
| ALL-CAPS via CSS, stable aria-label | FR-18, NFR-4 | ✅ |
| Empty/loading/error states, voice-pack copy | FR-11 | ✅ |
| Small well-defined API, consistent shapes/status codes | FR-20 | ✅ |
| One shared Todo type / core entity | FR-7, "Core entity — Todo" block | ✅ |
| Bias to simplicity | NFR-3 | ✅ |

No PRD statement **contradicts** any project-context rule. Findings below are gaps/mismatches, not contradictions.

## Findings

### F1 — Voice-scope boundary is a project-context rule with no PRD capability statement (Low/Medium)
project-context §Voice Pack states an explicit boundary: "Scope of the voice is user-facing copy ONLY. Code identifiers, comments, commit messages, logs, error codes, API field names, and docs stay plain and professional — never Torgue," reinforced by the Don't-Miss rule "Never leak the Torgue voice into code, logs, comments, or API contracts."

The PRD says the voice applies to "all user-facing copy" (FR-13, Overview) but never states the *negative boundary* as a capability/constraint: that API field names, error codes, logs, and other non-user-facing surfaces must stay plain/professional. This has product-observable consequences (e.g., API contract field names, developer-facing error codes) and is a stated project rule, so it is arguably a capability the PRD should assert — e.g. under Feature C or NFR — rather than leave implicit. Suggest a one-line constraint: "The voice is scoped to user-facing copy only; API contracts, error codes, and logs remain plain."

### F2 — Rotation "all variants reachable" test guarantee not surfaced as a capability (Low)
project-context Testing rules require the rotation selector to guarantee (a) no back-to-back repeats AND (b) **all variants are reachable**. PRD FR-15 captures (a) the no-repeat behavior, but not (b) reachability. Reachability is a genuine product-quality property (dead variants = wasted delight), not merely a test-how detail. The deterministic/seed-injection mechanism is correctly kept in project-context/addendum. Optional: extend FR-15 or a success metric to note that every authored variant is reachable in rotation.

### F3 — Addendum FR cross-references are stale / mismatched (Medium — internal consistency)
The addendum cites FR numbers that do not match the current PRD numbering, which will mislead readers reconciling the two docs:
- Addendum: "Must satisfy **FR-17** (durable, server-side, survives refresh/session)" — durable persistence is actually **FR-19** in prd.md. (FR-17 is the clarity rule.) The Open Questions section of prd.md correctly cites FR-19, so the addendum is the stale one.
- Addendum: "Optimistic-UI + rollback (**FR-8**)" — optimistic UI is actually **FR-10**. (FR-8 is sort options.)
- Addendum: "FR-11–FR-16 reference it" (voice) and "FR-6 constraint / NFR-6" (forward-compat) — voice FRs are **FR-13–FR-18**, and the forward-compat constraint is **NFR-6** (there is no "FR-6 constraint"; FR-6 is completed-task styling).

These are not contradictions with project-context, but they undermine the PRD/addendum pair's traceability back to the project-context rules. Recommend re-numbering the addendum references to the current PRD.

### F4 — "Never break accessibility with rotating aria-labels" fully covered (No action)
Confirmed FR-18 + NFR-4 + Counter-metric cover the accessibility Don't-Miss rule. Noted only to close the loop.

## Verdict
No contradictions between PRD and project-context. Minor capability gaps (F1 voice-scope boundary, F2 variant reachability) and one internal-consistency issue (F3 stale FR references in the addendum). The intentional tech-how separation is respected and not flagged.
