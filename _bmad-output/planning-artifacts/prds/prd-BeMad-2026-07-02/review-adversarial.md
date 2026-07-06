# Adversarial Review — BeMad PRD (finalize gate)

**Reviewer role:** Adversarial reviewer, calibrated to demo/portfolio stakes.
**Artifacts reviewed:** `prd.md`, `addendum.md`, and the referenced Voice & Copy Guide (`briefs/brief-BeMad-2026-07-02/addendum.md`, §2).
**Date:** 2026-07-02

**Verdict:** Solid, right-sized PRD; ~80% ready. It will NOT block a competent dev, but a handful of copy-rotation and optimistic-UI edge cases are underspecified enough that two devs would implement them differently — and one broken cross-reference in the addendum will actively mislead. Resolve the BLOCKER + the HIGH interaction/consistency items before finalize.

---

## BLOCKERS (fix before finalize — cheap, high-confidence)

### B1. Addendum FR cross-references are all wrong — will misdirect implementation
`addendum.md` cites FR numbers that do not match the PRD's actual numbering:
- "Must satisfy **FR-17** (durable, server-side...)" → durability is **FR-19** in the PRD. FR-17 is actually the *clarity* rule.
- "Optimistic-UI + rollback (**FR-8**)" → optimistic UI is **FR-10**. FR-8 is *sort options*.
- "FR-11–FR-16 reference it [voice guide]" → the voice FRs are **FR-13–FR-18**; FR-11 is empty/loading/error states, FR-12 is responsiveness.
- "an `owner` concept (**FR-6** constraint / NFR-6)" → FR-6 is "completed tasks visually distinct"; the forward-compat constraint is **NFR-6**.

These are load-bearing pointers a dev will follow. Every one points at the wrong requirement. Renumber/repair before this ships to architecture.

---

## HIGH (would cause divergent implementations or visible bugs)

### H1. "Re-roll label on each interaction" is undefined for the toggle and for text inputs
FR-15 / voice guide §2: "interactive controls re-roll their label on each interaction." This is unambiguous for the Add button (click → new label). It is **undefined** for:
- **The complete/incomplete toggle (FR-4).** A checkbox has no persistent text label to rotate — its visible label is the task text, and its action label ("CRUSH IT" / "DONE AND DONE") only appears for uncompleted items. Does toggling *back to active* re-roll? Does the label even exist while completed? What is the "label" of a bare checkbox?
- **The Add-task text input.** Is typing an "interaction"? If the placeholder re-rolls on keystroke, the placeholder text changes while the user types (though placeholders vanish on input, so likely moot — but the FR doesn't say). If focus counts as an interaction, tab-cycling flickers placeholders.
- **The sort control (FR-8).** See H2.
QA cannot verify FR-15 against the toggle or input because the intended behavior isn't stated. Decision needed: define "interaction" precisely (e.g. "re-roll on the action that *commits* the control's operation — click of a button-type control; NOT on hover, focus, keypress, or checkbox toggle").

### H2. The sort control's own label rotating mid-sort is unaddressed
FR-8 gives sort options; FR-15 rotates interactive control labels. If the sort trigger is a button/dropdown whose label rotates, then: (a) the control naming the current sort state changes wording on each use, and (b) if variants are applied to the *option labels* ("newest-first"), rotation could make the selected option's text differ from what the user picked. Torgue-voicing a *state-bearing* control (one whose label communicates current selection) conflicts with the clarity rule (FR-17). Not covered. Decide: sort option labels are stable/non-rotating, OR only the trigger's flavor text rotates while the state indicator stays fixed.

### H3. Optimistic rollback UX is underspecified for edit and delete
FR-10 says mutations update optimistically, reconcile, and "roll back with a voiced error message on failure." Unspecified failure modes a dev must guess at:
- **Edit fails to save:** does the text revert to the pre-edit value? Does the editor re-open with the user's attempted text so they don't lose it? (Silently reverting loses the user's typing — a real annoyance even in a demo.)
- **Delete fails after optimistic removal:** does the task reappear in its original list position and sort order? At what point (mid-sort, with rotation) does it re-render?
- **Toggle fails:** does the checkbox visibly snap back? The "voiced error" is defined (Network/save failure pack exists) but the *state reconciliation* per operation is not.
- **Retry:** FR-11/voice pack has a Retry button — but the PRD never says a failed optimistic mutation is *retryable* vs. simply rolled back. Is there a retry affordance per FR-10, or only a toast?

### H4. Concurrency: delete during pending create, and create-ordering, are unhandled
- **Delete during a pending create (FR-1 optimistic add not yet server-confirmed):** the task has no server `id` yet. Deleting it must cancel/ignore the in-flight create, not fire a DELETE against a missing id. Not addressed.
- **Edit during pending create:** same problem — editing a task whose `id` hasn't returned.
- **Rapid creates:** ordering by `createdAt` (FR-7/FR-8 default newest-first) — if client assigns optimistic timestamps and server assigns authoritative ones, does reconciliation resort the list (visible jump)? For a single-user demo this is low-frequency but a QA tester mashing "add" will see it.

---

## MEDIUM (ambiguous/untestable as written)

### M1. Validation: client-only or server-too? (FR-9 / FR-20)
FR-9 states the rules (reject empty/whitespace-only, cap 1000 chars, voiced message) but not *where* enforced. FR-20 mentions "appropriate status codes." A dev needs to know: is server-side validation required (returning 4xx with a voiced-friendly error), or is client validation sufficient for a single-user demo? The core entity says `text` is "non-empty, ≤1000 chars" — implying a server invariant — but no FR mandates the server reject a bad payload. Also unspecified: is text **trimmed** before the empty check and before storage (leading/trailing whitespace)? Is 1000 counted in code units, Unicode code points, or grapheme clusters (emoji in Torgue copy suggests users may paste emoji)? State the trim rule and the counting unit.

### M2. Rapid-interaction flicker / rotation timing is not a stated constraint
FR-15 rotation + NFR-1 perceived-instant: rapid clicking a button re-rolls its label on every click. Is there any debounce, or is per-click flicker acceptable (probably fine for Torgue's aesthetic)? More importantly: **when** does the label re-roll relative to the optimistic action — before the action fires, on click, or after server reconcile? If after reconcile, a failed mutation may leave a re-rolled label attached to a rolled-back action. Untestable until "re-roll timing" is pinned. Recommend: re-roll synchronously on the committing interaction, independent of async result.

### M3. "Never repeating the same variant twice in a row for a given key" — scope of "in a row" is ambiguous
FR-15. Per-surface-load selection and per-interaction re-roll both invoke this rule. Questions QA can't resolve:
- Is "twice in a row" tracked **per key globally**, or **per control instance**? (Two delete buttons on two tasks — do they share rotation history?)
- Does a page reload reset the "last shown" memory, allowing the same variant twice across a reload? (Almost certainly yes/acceptable, but state it.)
- With ~5 variants and "no immediate repeat," is the intended algorithm shuffle-bag or "pick any other index"? The addendum offers both ("cycle through a shuffled order, OR pick a different index") as equivalents — they produce different, testable distributions. The deterministic-seed testability requirement (addendum) means the chosen algorithm IS a spec item, not an implementation detail.

### M4. Accessibility of rotating vs. stable aria — specified in principle, gaps in practice (FR-18 / NFR-4)
Good that FR-18 mandates a stable `aria-label`. Remaining unspecified tensions:
- **Live-region announcements:** toasts (completion, error) use rotating copy. Are they in an `aria-live` region? If a screen reader announces the visible Torgue toast, the "stable aria" principle doesn't apply to toasts (they have no persistent action label) — so SR users hear the rotating flavor text. Acceptable? Probably, but FR-18 only covers *interactive control* labels, not transient announcements.
- **Confirm/cancel buttons in delete dialog** rotate too (voice guide gives 5 confirm + 5 cancel variants incl. lowercase "abort abort"). Do these get stable aria-labels ("Confirm delete" / "Cancel")? FR-18 says "interactive controls" — dialog buttons qualify — but the guide's example rotation (`DO IT`, `NO MERCY`) is dangerously ambiguous *as a stable accessible name* if aria isn't overridden. Worth an explicit callout that confirm/cancel need fixed aria names.
- **ALL-CAPS via CSS `text-transform`:** covered. But some variants are *stored* with caps/punctuation for emphasis (`ADD IT!!!`, `BOOM!`) — text-transform can't undo stored caps. Verify the "no shouty stored strings" rule (FR-18) is actually followed by the starter variants, several of which are stored in caps.

### M5. FR-2 / FR-11 loading-state relationship on first paint
FR-2: "users see their full list immediately on opening." FR-11: distinct loading state. If persistence is server-side (FR-19), initial load is async — so there IS a loading state before the list, contradicting "immediately." For a demo this is a wording nit, but define: does "immediately" mean no login/splash (the UJ-1 reading), tolerating a brief loading state? State it so QA doesn't file "list not immediate" against FR-2.

---

## LOW / NITS

### L1. Success metric "0 data-loss in testing" needs server persistence chosen to be testable
The persistence-stability metric and FR-19 are verifiable only once the (deferred) persistence mechanism exists. Fine to defer, but the finalize gate should note this metric is untestable until architecture resolves Open Question 1. (Not a PRD defect — flagging the dependency.)

### L2. Scope-out leakage check — mostly clean, two soft leaks
- **Sort (FR-8) vs. scoped-out "search/filtering":** "active-before-completed" sort is a grouping, not filtering — acceptable, but a dev could over-read it as a filter. Confirm it's sort-only (all tasks remain visible).
- **"active-before-completed" ordering + toggle (FR-4):** toggling completion while that sort is active makes a task jump position immediately. Interaction with optimistic UI (H3) — reconciling a toggle that also reorders. Minor, but the reorder-on-toggle behavior isn't stated.
- Everything else in the scope-out list (auth, deadlines, tags, notifications, multi-voice) stays out of the FRs correctly. NFR-6 / addendum `owner` concept is correctly framed as "leave room, don't build."

### L3. FR-7 metadata is creation-timestamp only; edit/complete produce no `updatedAt`
Consistent with the entity model (`id, text, completed, createdAt` — no `updatedAt`). Fine for scope, but note oldest/newest sort is by `createdAt` only, so an edited or re-activated task never re-sorts. Intentional? Confirm.

### L4. "~5 variants" is fuzzy for QA
FR-14 "~5 semantically-identical variants." The guide ships exactly 5 per key. QA can't fail a key that has 4 or 6. Either accept "≥3" as a testable floor or state "exactly 5 unless noted." Low stakes.

---

## Summary table

| ID | Severity | Area | One-liner |
|----|----------|------|-----------|
| B1 | Blocker | Cross-refs | Every FR reference in addendum points to the wrong FR |
| H1 | High | Interaction | "Re-roll on interaction" undefined for toggle + text input |
| H2 | High | Interaction | Sort control label rotating mid-sort / state-bearing label vs. clarity rule |
| H3 | High | Consistency | Optimistic rollback UX per-operation (edit revert? delete reinsertion? retry?) unspecified |
| H4 | High | Concurrency | Delete/edit during pending create (no server id); rapid-create reorder |
| M1 | Medium | Validation | Client-only vs. server; trim rule; 1000-char counting unit |
| M2 | Medium | Interaction | Rotation timing vs. async action; flicker/debounce |
| M3 | Medium | Rotation | "No repeat in a row" scope (per-key vs per-instance), algorithm is a spec item |
| M4 | Medium | Accessibility | Toasts/dialog confirm-cancel aria; stored-caps variants vs. text-transform rule |
| M5 | Medium | States | FR-2 "immediately" vs. FR-11 async loading state |
| L1–L4 | Low | Various | Metric testability dependency; sort-vs-filter leak; no updatedAt; "~5" fuzziness |
