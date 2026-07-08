# Accessibility Audit — BeMad

**Story:** 4.2 (Coverage & accessibility audit) · **Standard:** WCAG 2.2 Level A/AA
**Result:** ✅ **Zero critical violations. Zero serious violations** except one deliberate, allowlisted Label-in-Name trade-off (below).
**Status:** Automated — this audit is a gate in CI (Story 4.1), not a one-off.

## Tooling & method

- **`@axe-core/playwright` 4.12.1**, driven by the Playwright E2E suite.
- Tags analysed: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`.
- Automated spec: [`tests/e2e/a11y.spec.ts`](../../tests/e2e/a11y.spec.ts) — 7 tests: 4 axe-scan tests (5 `axe` scans across the 5 states below — the list test scans both the list and the open dialog) + 3 behavioural checks. Run on both the desktop (Chromium) and mobile (Pixel 7) projects on every push/PR.
- Gate logic: **fail on any `critical`**; **fail on any `serious`** *except* a `label-content-name-mismatch` whose every offending node is an allowlisted rotating-voice control (see trade-off). A mismatch on any other control (sort select, checkbox, a future control) still fails.

> Note: automated tooling catches a large share, not 100%, of WCAG issues. The behavioural checks below cover keyboard operability and focus management that axe cannot fully assert.

## States scanned (axe, zero critical)

| State | How it's reached | Controls present |
| ----- | ---------------- | ---------------- |
| Empty | GET returns `[]` | add-task, sort |
| Populated list | GET returns a seeded task | add-task, sort, per-row toggle/edit/delete |
| Delete-confirm dialog | open the row's Delete | confirm-delete, cancel-delete (focus trapped/returned) |
| Edit-in-place | open the row's Edit | edit input, save, cancel-edit |
| Load-error | GET returns 500 | retry (role="alert" region) |

## Behavioural a11y (beyond axe)

- **Keyboard-operable core flow:** add (Tab→Enter), toggle (Space on checkbox), delete (Enter→confirm) — all reachable and operable without a mouse.
- **Focus management:** the delete-confirm opens with focus on Cancel (`autoFocus`) and **returns focus to the Delete trigger on cancel** (Epic 1/3 action item — resolved).
- **Stable accessible names:** a control's accessible name is unchanged across a voice re-roll even though its visible text rotates (asserted directly).
- **Caps via CSS (FR-20):** ALL-CAPS styling is `text-transform` only; the accessible name/DOM text is natural case, so screen readers don't spell out shouting.

## Known, deliberate trade-off — WCAG 2.5.3 (Label in Name)

The rotating-voice concept gives the **action controls** a *stable* `aria-label` (e.g. `"Add task"`, `"Delete task: <text>"`) while their *visible* text is voiced Mr. Torgue copy that rotates. Because the accessible name doesn't contain the visible text, axe reports `label-content-name-mismatch` (impact `serious`) on these controls.

**Decision (standing constraint, Epic 3 retro):** stable accessible names win. A user relying on a screen reader gets a consistent, meaningful name; sighted users get the voice. The alternative — rotating the accessible name too — would make the control's name unstable for assistive tech, which is worse. This is revisited only if voice-input (speak-the-label) support is ever required.

**Scope of the allowance (tightened in Story 4.2):** the audit tolerates this mismatch **only** for these controls, by `data-testid`:

```
add-task · retry · dismiss · edit · delete · save · cancel-edit · confirm-delete · cancel-delete
```

The sort `<select>` (its wrapping `<label>` provides a clean 2.5.3-compliant name) and the row checkboxes (`aria-label` contains the task text) are **not** allowlisted — a mismatch there would fail the audit. This prevents the allowance from silently masking a real regression on a non-rotating control (previously the rule was suppressed page-wide).

## Known non-blocking gaps (tracked, not WCAG-critical)

- **Focus after a *confirmed* delete falls to `<body>`.** On the cancel path focus returns to the Delete trigger (verified). On confirm-success the row unmounts (optimistic removal) while Confirm is focused, so focus drops to `document.body` — a keyboard user's next Tab restarts from the top (degrades WCAG 2.4.3 Focus Order; does not block operability). A clean fix needs parent-level focus coordination in `TodoView` (move focus to the next row / New-task input), which is an app **behaviour** change out of this measure-and-document story's scope. Tracked in `deferred-work.md`; targeted at a follow-up a11y polish.

## How to run locally

```bash
docker compose --profile test up -d --wait db-test
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npm run db:migrate
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npx playwright test a11y
```
