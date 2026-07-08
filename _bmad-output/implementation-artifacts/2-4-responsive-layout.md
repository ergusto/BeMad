---
baseline_commit: 8e5b1b78ad502fec7882a2d60982b909c6740365
---

# Story 2.4: Responsive layout

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to work well on phone and desktop,
so that I can manage tasks anywhere.

## Acceptance Criteria

1. **Given** the app on a mobile **or** desktop viewport, **when** I use it, **then** the layout adapts with **no horizontal scrolling** and **no overlapping/clipped** controls, and **all controls remain usable** (FR-13, NFR-5).
2. **And** long, unbroken task text wraps within the layout rather than forcing horizontal overflow.
3. **And** every existing behaviour and accessible name/role is preserved — this is a **presentation-only** story (no changes to the store, API, component logic, or DOM roles/labels).

## Tasks / Subtasks

- [x] **Task 1 — Responsive layout CSS (`app/globals.css`)** (AC: #1, #2)
  - [x] Add-task form responsive: `main form { display:flex; flex-wrap:wrap; align-items:center; gap }`, input `flex:1 1 12rem; min-width:0`. Controls `box-sizing:border-box; max-width:100%`.
  - [x] Task rows responsive: `main li { display:flex; flex-wrap:wrap; align-items:center; gap }`; `.todo-text { flex:1 1 8rem }`; `main li span { min-width:0; overflow-wrap:anywhere }` so long unbroken text wraps (AC #2).
  - [x] Sort control (`main label` inline-flex), edit-in-place form (`main li form { flex:1 1 100% }`), delete-confirm group, and pending row all wrap within the same flex list/section.
  - [x] Kept centered `main` + `html,body{max-width:100vw;overflow-x:hidden}` safety net, but content genuinely fits (the long-text E2E asserts the row wraps within itself, not just the clipped body).
  - [x] Touch usability: `button, select, input:not([type=checkbox]) { min-height:2.75rem; padding }`; checkbox sized `1.15rem`.
  - [x] AD-10 respected: CSS-only, no CSS `content` text, no low-contrast dimming (`.todo-done` line-through kept; timestamp only font-size, no opacity).
- [x] **Task 2 — Minimal, non-behavioural markup hooks (`app/todo-app.tsx`)** (AC: #3)
  - [x] Added one layout hook: `className="todo-text"` (with `todo-done` when completed) on the task-text span. No DOM structure/roles/aria-labels/`data-*`/behaviour changed; entire existing suite stays green.
  - [x] Verified the viewport meta is present (Next injects `width=device-width, initial-scale=1` — confirmed in served HTML); no `layout.tsx` change needed.
- [x] **Task 3 — E2E layout assertions at mobile + desktop (`tests/e2e/responsive.spec.ts`)** (AC: #1, #2)
  - [x] Seeds a deterministic list via GET interception incl. a 120-char unbroken-text task.
  - [x] At mobile (360×740) and desktop (1280×800): asserts the long-text `<li>` wraps within itself (`scrollWidth − clientWidth ≤ 1`) AND the page has no horizontal scroll (`documentElement.scrollWidth ≤ innerWidth + 1`).
  - [x] Asserts New-task input, Add button, Sort select, and a row's checkbox/Edit/Delete are visible at mobile, and Edit is actually operable.
  - [x] Complements the existing `mobile` (Pixel 7) + `chromium` (desktop) projects that already run core flows at two viewports.
  - [x] Typecheck + lint clean; full Vitest green with `TEST_DATABASE_URL` (131); all existing E2E pass on both projects (48 total). `fileParallelism:false` kept.

## Dev Notes

### What this story adds (FR-13 responsive, presentation-only)

Epic 1/2 built the behaviour (CRUD, states, optimistic, sort) with **plain, mostly-unstyled markup**. Story 2.4 makes that markup **adapt to viewport** — flex layouts that wrap, text that wraps, touch-friendly controls, and provably no horizontal scroll — **without touching any logic**. This is the last Epic 2 story; after it the app "works cleanly on desktop and mobile" (Epic 2 goal).

- **Current styling baseline (`app/globals.css`):** light/dark CSS vars; `html, body { max-width: 100vw; overflow-x: hidden }`; `body` system font + `line-height: 1.5`; `main { margin: 0 auto; max-width: 42rem; padding: 2rem 1rem }`; `.todo-done { text-decoration: line-through }`. That's it — no flex, no responsive rules, no control sizing.
- **Current markup (`app/todo-app.tsx`):** `<section>` → add `<form>` (input + Add button), optional `role="alert"` blocks (form error / mutation-error banner), and the states branch (loading `<p>` / error `<div role=alert>`+Retry / empty `<p>` / ready `<>` with a `<label>Sort tasks <select></label>` + `<ul>`). Each `<li>` is either a `PendingRow`, a `TodoItem` in **edit mode** (a `<form>` with Edit-task input + Save + Cancel + optional validation `role=alert`), or a `TodoItem` in **view mode** (checkbox + text `<span>` + `<time>` + Edit + [Delete | confirm-delete `<span role=group>` with Confirm/Cancel]). All rendered with plain whitespace between inline elements — this is what needs flex/wrap.

### Design rules (implement exactly)

- **Presentation only.** No changes to `lib/store/*`, `lib/todos*`, the API/routes, or component behaviour. Markup changes limited to **non-behavioural className hooks** if needed (Task 2). Preserve every accessible name/role and every `data-*`/aria attribute the existing tests rely on (`New task`, `Add task`, `Sort tasks`, `Completed: …`, `Edit`, `Edit task`, `Save`, `Cancel`, `Delete: …`, `Confirm delete: …`, `Retry`, `Dismiss`, `data-completed`, `data-pending`, `role="alert"`, `role="group"`).
- **Genuinely fit, don't just hide.** The `overflow-x: hidden` safety net stays, but AC #1 ("no horizontal scrolling") must hold because content **fits** (wrapping long text, `min-width: 0` on flex children, `box-sizing: border-box`). The long-unbroken-text E2E is the guard.
- **Mobile-first, additive.** Prefer base styles that work on small screens and enhance up with `@media (min-width: …)` if useful; avoid fixed pixel widths that overflow narrow viewports.
- **Two viewports matter (NFR-5):** phone (~360px) and desktop (~1280px). The Playwright `mobile` (Pixel 7) + `chromium` projects already run everything at both; keep them green.

### Scope fences (do NOT build here)

- **Voice / theming** (Torgue copy, colors-as-personality) → **Epic 3**. Keep styling neutral/functional; no voiced text.
- **Perf/accessibility audit** (axe, Lighthouse, WCAG 2.2 AA sweep) → **Epic 4** (Story 3.4 / 4.2). This story does functional responsive layout + basic touch sizing, not the full a11y audit (though don't regress AD-10).
- **No new dependencies** (no CSS framework, no Tailwind, no CSS-in-JS lib) — hand-written CSS in `globals.css`. **No store/API/schema changes.**

### Architecture compliance (guardrails)

- **AD-10 a11y contract:** styling via CSS only; never inject text via CSS `content` for meaningful content; keep stable aria names/roles; WCAG-AA contrast (no dimming that lowers contrast). The `.todo-done` line-through stays.
- **AD-11 XSS-safe:** unaffected (no new text rendering). **AD-8:** no voiced copy. **AD-1/2/14:** untouched — this is the view layer only.
- **FR-13 / NFR-5:** responsive + usable on evergreen desktop & mobile viewports.

### Learnings carried from Epic 1 + 2.1–2.3 (apply them)

- **E2E via `page.route` GET interception** for a deterministic seeded list (the house pattern). Include a long-unbroken-text item to stress wrapping. Assert layout with `page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)` and control visibility with role/label locators (`Sort tasks`, `New task`, `Add task`, `Completed: …`, `Edit`/`Delete` exact).
- **Do not regress accessible names / the single-editor + delete-confirm behaviour** — 42 existing E2E + 131 unit tests must stay green untouched. If you add class hooks, they must not alter any queried attribute.
- **`page.setViewportSize({ width, height })`** to assert both viewports within one spec (independent of the project device emulation). Keep assertions tolerant (±1px) to avoid sub-pixel flake.
- **Test infra:** `fileParallelism:false`; run Vitest with `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test`; E2E `webServer` reuses the running dev server. No new deps; Node 24.

### Latest tech information

- **Next.js App Router** injects a default responsive viewport meta (`width=device-width, initial-scale=1`); override only via `export const viewport: Viewport` in `app/layout.tsx` if verification shows it missing — do not hand-write a `<meta>` in the body.
- **Modern CSS, no deps:** flexbox with `gap` and `flex-wrap`; `min-width: 0` to let flex children shrink and wrap; `overflow-wrap: anywhere` (and/or `word-break: break-word`) to break long unbroken strings; `box-sizing: border-box`. All broadly supported in evergreen browsers (NFR-5). Consider `@media (min-width: 40rem)` for desktop enhancements.

### Project Structure Notes

- **UPDATE:** `app/globals.css` (responsive rules — the bulk of the work), and **only if needed** `app/todo-app.tsx` (non-behavioural class hooks) / `app/layout.tsx` (explicit viewport export only if missing).
- **NEW:** `tests/e2e/responsive.spec.ts` (layout assertions at mobile + desktop).
- **PRESERVE (no regression):** all store/API/schema/component behaviour and the entire existing Vitest + E2E suite.

### References

- [Source: planning-artifacts/epics.md#Story-2.4] user story + AC (adapts without horizontal scrolling/overlap; controls usable) + tests (Playwright core flow at mobile & desktop, layout assertions)
- [Source: planning-artifacts/epics.md#FR-13] responsive & usable on desktop and mobile; [#NFR-5] evergreen browsers, desktop & mobile viewports
- [Source: planning-artifacts/architecture/*ARCHITECTURE-SPINE*.md#AD-10] a11y contract (CSS-only styling, stable aria names/roles, WCAG-AA); [#AD-8] no voice yet; [#AD-11/AD-14] unaffected (view-only)
- [Source: app/globals.css] current baseline styles; [Source: app/todo-app.tsx] current markup to make responsive (must preserve names/roles); [Source: app/layout.tsx] viewport meta
- [Source: playwright.config.ts] existing `chromium` (desktop) + `mobile` (Pixel 7) projects already run core flows at two viewports
- [Source: _bmad-output/project-context.md] responsive/mobile requirement; no new deps; AD-10 a11y

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run typecheck` / `npm run lint` — clean.
- Viewport meta confirmed via `curl http://localhost:3000/` → `<meta name="viewport" content="width=device-width, initial-scale=1">` (Next default).
- `TEST_DATABASE_URL=… npx vitest run` — **131 passed** (unchanged; presentation-only story adds no unit tests).
- `npx playwright test` — **48 passed, 2 skipped** (was 42; +6 responsive across chromium + mobile).

### Completion Notes List

- **Presentation-only responsive layout (FR-13/NFR-5).** All work is CSS in `app/globals.css` plus a single non-behavioural class hook (`todo-text`) on the task-text span. No store/API/schema/component-logic changes; no DOM roles, accessible names, `data-*`, or behaviour altered — the full 131 unit + existing 42 E2E suites pass unchanged.
- **Layout approach:** flexbox with `gap` + `flex-wrap` for the add-form, task rows, edit form, and sort control; `min-width:0` + `overflow-wrap:anywhere` so long unbroken text wraps instead of overflowing; `box-sizing:border-box` + `max-width:100%` so controls never exceed the container; ~44px min tap targets on buttons/select/inputs (checkbox sized directly).
- **Genuine fit, not just clipping:** the `overflow-x:hidden` safety net stays, but the new E2E asserts the long-text `<li>` wraps *within itself* (`scrollWidth − clientWidth ≤ 1`) — a real wrapping test that would fail if the CSS were removed — plus a page-level no-horizontal-scroll sanity check, both at 360px and 1280px.
- **AD-10 preserved:** CSS-only styling, no CSS `content` for meaningful text, `.todo-done` stays line-through with no contrast-lowering dimming.
- **No new dependencies.** Next's default viewport meta is present (verified) — no `layout.tsx` change.

### File List

- `app/globals.css` — UPDATE (responsive flex/wrap layout, long-text wrapping, touch-target sizing)
- `app/todo-app.tsx` — UPDATE (one non-behavioural `todo-text` class hook on the task-text span)
- `tests/e2e/responsive.spec.ts` — NEW (layout assertions at mobile + desktop; long-text wrap; controls usable)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-07 | Story 2.4 drafted (ready-for-dev): presentation-only responsive layout — flex/wrap add-form + task rows, long-text wrapping, touch-friendly control sizing in `app/globals.css` (optional non-behavioural class hooks); E2E layout assertions (no horizontal overflow + controls usable) at mobile & desktop viewports. Preserves all behaviour/accessible names. |
| 2026-07-07 | Story 2.4 implemented (review): responsive CSS in `app/globals.css` (flex/wrap form + rows, `overflow-wrap:anywhere` long-text wrap, ~44px tap targets), one `todo-text` class hook; viewport meta verified present. `responsive.spec.ts` (row wraps + no page scroll at 360/1280, controls usable). 131 Vitest, 48 E2E. |
| 2026-07-07 | bmad-tea automate: +1 boundary viewport (320px narrowest phone) to the overflow/wrap E2E. 131 Vitest, 50 E2E. No unit surface (CSS-only story). |
| 2026-07-08 | Code review (adversarial 3-layer): Auditor "Faithful", no AC violations. 3 patches applied — control CSS scoped under `main`, overflow assertion retargeted to `<main>` (was near-tautological), checkbox tap target → 24px (WCAG 2.5.8 AA). 0 deferred, 4 dismissed. 131 Vitest, 50 E2E. Status → done. |

### Review Findings (2026-07-07, adversarial 3-layer)

Acceptance Auditor: "Faithful — no true AC violations." Edge Hunter: no behavioural/regression issues.

Patch (all applied 2026-07-08):

- [x] [Review][Patch] Global control-sizing rules scoped — FIXED: `input/button/select` sizing + tap-target rules now scoped under `main` so they don't leak to future markup. [app/globals.css]
- [x] [Review][Patch] Page-level no-overflow assertion made meaningful — FIXED: the check now asserts on the un-clipped `<main>` container (`scrollWidth ≤ clientWidth`) instead of the clamped document element, so it catches whole-UI overflow. [tests/e2e/responsive.spec.ts]
- [x] [Review][Patch] Checkbox tap target — FIXED: sized to `1.5rem` (24px), meeting WCAG 2.5.8 AA minimum. [app/globals.css]

Dismissed (4): `main label` too broad (false positive — only the sort control uses a `<label>`; New/Edit use `aria-label`); "long text doesn't wrap at desktop" (false — `main` capped at 42rem so it wraps at every width); `main li span` broad (intentional — other spans should wrap too); desktop controls-usability not E2E-asserted (acceptable per AC "mobile OR desktop").
