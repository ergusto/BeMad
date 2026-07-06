# PRD Quality Review — BeMad — Todo App PRD

## Overall verdict

This is a tight, well-calibrated PRD for its declared stakes: a right-sized portfolio/demo todo app whose one bet — Mr. Torgue-voiced rotating copy — is stated up front and carried through into concrete, testable FRs. Decision-readiness, strategic coherence, and shape fit are strong; the PRD knows exactly what it is and does not pad itself with enterprise furniture. The main risks are mechanical and downstream: broken FR cross-references in the addendum, a few soft acceptance conditions, and a shared reliance on external documents (the brief addendum, project-context.md) that a story author must chase down.

## Decision-readiness — strong

The PRD makes real decisions and states them as such. The differentiator is committed to in §1, not hedged. Scope §6 draws a hard line: FR-1..20 are in, and a substantial "Out (v1), by design" list names what was given up (auth, multi-user, priorities, due dates, tags, search, multiple voices). The one Open Question (§7, persistence mechanism) is genuinely open and correctly deferred to architecture rather than being a rhetorical question with a buried answer. Counter-metrics in §2 ("Voice/rotation never reduces task-completion success"; "No accessibility regressions") are the right tensions to name for this product — they guard the exact place where the differentiator could hurt the core value. The `[NOTE FOR PM]` mechanism from the rubric is absent, but for a solo demo there is no PM tension to flag, so its absence is appropriate rather than a gap.

### Findings
- **low** Single Open Question with no owner/decision trigger (§7) — Persistence is deferred to architecture, which is correct, but the entry does not state when/how it gets resolved. *Fix:* one clause noting it is decided in `bmad-architecture` and gated by FR-19.

## Substance over theater — strong

Content is earned, not furniture. No persona bloat: one user, described in one sentence, and the description actually constrains the design (no accounts/roles feeds directly into NFR-6 and the Non-Goals). The differentiator is real novelty grounded in specific mechanics (FR-13..18), not a template's "Differentiation" heading. NFRs mostly avoid boilerplate: NFR-4 ties accessibility specifically to the rotating/ALL-CAPS risk, and NFR-6 is a genuine forward-compatibility constraint rather than a generic "scalable" platitude. The Success Metrics are qualitative-but-honest ("qualitative for a demo") rather than pretending to instrument DAU/MAU on a single-user app.

### Findings
- **low** NFR-1 restates a metric rather than adding a bound (§5) — "interactions feel instantaneous under normal conditions (see perceived-instant metric)" is nearly circular with the §2 metric. Acceptable at this stakes level, but it is the closest thing to NFR theater here. *Fix:* either drop NFR-1 and let the SM carry it, or state the ~<100ms target directly rather than by reference.

## Strategic coherence — strong

There is a clear thesis: a todo app where the *voice* is the product, so the core loop must be flawless and invisible while personality does the delighting. Feature grouping follows the thesis — Feature A (core loop), B (instant/polished experience), C (personality/voice, explicitly "differentiator"), D (persistence/API). The Success Metrics validate the thesis rather than measuring activity: "delight lands" and "zero-guidance usability" are the two things this product bets on, and both are measured. Counter-metrics are present. This does not read as a backlog with headings.

### Findings
- None material.

## Done-ness clarity — adequate

Most FRs carry a testable consequence. FR-9 (empty/whitespace rejected, 1000-char cap), FR-15 ("never repeating the same variant twice in a row for a given key"), FR-16 (profanity always bleeped), FR-5 (deletion requires confirmation), and the Todo entity definition are all crisply verifiable. This is the strongest area for a demo of this size. But several FRs and NFRs lean on adjectives the rubric flags:

### Findings
- **high** "Instantaneous / no perceptible lag" has no engineering bound (§2 perceived-instant, NFR-1, FR-10) — the only number, `<100ms`, is tagged `[ASSUMPTION]` and never promoted to a testable threshold. An engineer cannot write a passing test against "no perceptible lag." *Fix:* promote a concrete budget (e.g. optimistic UI update within one frame / <100ms; server reconcile within a stated window) as the acceptance condition.
- **medium** FR-2 "immediately" and FR-6 "at a glance" / "visually distinct" are unbounded (§4) — testable only by human judgment. *Fix:* for FR-6, state the mechanism ("completed tasks shown with strikethrough and reduced opacity") so it is checkable; for FR-2, tie to the same load-time budget as above.
- **medium** FR-17 "unambiguously conveys the action" is a judgment call with no test (§4) — this is the core clarity guarantee protecting the differentiator, yet there is no described way to verify a variant passes. *Fix:* reference the clarity rule in the Voice & Copy Guide as the acceptance oracle, or state a review checklist.
- **medium** NFR-2 "graceful … error handling that never breaks the core flow" (§5) — "graceful" is exactly the adjective the rubric says to flag. FR-10's rollback behavior partly covers it, but NFR-2 as written is not independently testable. *Fix:* define via FR-10's observable behavior (roll back + voiced error, list remains usable).

## Scope honesty — strong

Omissions are explicit and load-bearing. §6 "Out (v1), by design" does real work and even distinguishes "architecture leaves the door open; not built" for multiple voices, mirrored by NFR-6 for auth. The single `[ASSUMPTION]` tag (perceived-instant target) is honestly marked as an inference. Open-items density is very low (one Open Question, one `[ASSUMPTION]`) — appropriate and arguably ideal for a green-light-to-build demo.

### Findings
- **low** `[ASSUMPTION]` is inline but not indexed (§2) — the rubric's Assumptions Index roundtrip expects an index; with a single assumption this is negligible, but there is no index section. *Fix:* add a one-line Assumptions Index, or note explicitly that the single inline assumption needs none.

## Downstream usability — thin

This PRD feeds architecture and story creation, so traceability matters — and this is where the real defects are. There is no Glossary, so domain nouns ("task"/"todo", "surface", "key", "variant", "voice pack") are defined only by usage and drift slightly (see mechanical notes). More seriously, the addendum's FR cross-references are wrong, which will actively mislead a story author:

### Findings
- **high** Addendum FR cross-references are broken and off-by-many (`addendum.md`) — the addendum says persistence "Must satisfy FR-17", optimistic-UI is "FR-8", and the voice guide is referenced by "FR-11–FR-16". In the PRD, persistence is FR-19, optimistic-UI/rollback is FR-10, and voice-pack sourcing is FR-13. FR-17 is actually the clarity rule; FR-8 is sort options. Every one of these pointers resolves to the wrong requirement. *Fix:* renumber the addendum references to match the PRD (FR-19, FR-10, FR-13..18).
- **high** Addendum "FR-6 constraint / NFR-6" mislabels the forward-compat constraint (`addendum.md` §Forward-compatibility) — FR-6 is "completed tasks visually distinct"; the owner/auth constraint is NFR-6. *Fix:* drop the "FR-6" reference, keep NFR-6.
- **medium** No Glossary for a chain-top PRD (whole doc) — architecture and stories must source-extract terms; "task" vs "todo" and "voice pack"/"copy key"/"surface"/"variant" are used without definition. *Fix:* add a short Glossary defining Todo/task, voice pack, copy key, variant, surface.
- **medium** Key acceptance content lives in an external file (§FR-14, addendum §Voice & copy) — the authoritative Voice & Copy Guide (~5 variants per surface, clarity rule, accessibility rule) is in `briefs/brief-BeMad-2026-07-02/addendum.md §2`, not this PRD. A story author cannot build or test the differentiator from the PRD alone. This is a deliberate DRY choice, but it makes FR-13..18 non-self-contained. *Fix:* keep the source-of-truth external but inline the clarity rule and accessibility rule verbatim, since FR-17/FR-18 are untestable without them.

## Shape fit — strong

The PRD is shaped correctly for a solo/hobby consumer product: rigor is kept light, the single UJ (UJ-1, "Sam clears the morning list") has a named protagonist and is load-bearing rather than ceremonial, and there is exactly one persona. It has not been over-formalized (no forced multi-UJ matrix, no market sizing, no SLAs) nor under-formalized (the differentiator that carries actual UX weight is fully specified). The instruction to not penalize missing enterprise sections is satisfied on the merits — those sections would be bloat here and are correctly absent.

### Findings
- **low** Single UJ names "Sam" while §3 persona is unnamed (§3) — minor; the protagonist is introduced only inside the journey. Fine at this scale. *Fix:* optional — name the persona "Sam" in §3 for continuity.

## Mechanical notes

- **Glossary drift:** "todo" (title, entity name "Todo") vs "task" (used throughout FRs) are used interchangeably without a defining line. "voice pack" (FR-13), "copy key"/"key" (FR-14/FR-15), "surface" (FR-15), "variant" (FR-14..15) are consistent internally but undefined. Low individually; compounds with the missing Glossary.
- **ID continuity:** FR-1..FR-20 contiguous and unique in the PRD; NFR-1..NFR-6 contiguous. No gaps or duplicates *within* the PRD. The breakage is entirely in `addendum.md`, whose FR pointers (FR-17, FR-8, FR-11–FR-16, FR-6) do not resolve to the intended PRD requirements — see high-severity findings above.
- **Assumptions Index roundtrip:** one inline `[ASSUMPTION]` (perceived-instant target, §2); no index section. Acceptable at this count but not formally closed.
- **UJ protagonist naming:** UJ-1 has a named protagonist (Sam) carrying context inline. Good.
- **Required sections:** all sections appropriate to the stakes are present (Overview, Goals/SM + counter-metrics, Users + UJ, FRs, NFRs, Scope + Non-Goals, Open Questions). No missing required section for this shape.
