---
baseline_commit: 6cdf3d4a05f730b87c2025e61fb76de1cd11e9cc
---

# Story 3.3: Wire all surfaces to the voice pack

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want every button, message, and state to speak in the voice,
so that the personality is consistent everywhere.

## Acceptance Criteria

1. **Given** the UI from Epics 1–2, **when** any label, toast, empty/loading/error message, or confirm/cancel dialog renders, **then** its text comes from the **voice pack** (no hardcoded user-facing strings remain), with **action controls re-rolling on activation** and **transient surfaces picking fresh on each appearance** (FR-16).
2. **And** API `error.code` values are **mapped to voiced copy on the client**, not by the server (AD-8) — a failed load / mutation shows a **voiced** message, never the raw server string.
3. **And** ALL-CAPS is applied via **CSS** (`text-transform`), not stored strings; **accessible names stay usable** — for action controls the voiced visible text **is** the accessible name (WCAG 2.5.3), while **state/selection-conveying** names (checkbox completion, sort selection) stay **stable and unrotated** (FR-17, FR-20, AD-10).
4. **And** the whole existing test suite still passes — E2E control locators migrate to **stable `data-testid`s** (retro decision) so rotating copy can't break them; error-path E2E assert a **voiced (not raw)** message; a guard test asserts **no hardcoded user-facing strings** remain in the component.

## Tasks / Subtasks

- [x] **Task 1 — Mount the VoiceProvider** (AC: #1)
  - [x] `TodoApp` wraps `<VoiceProvider>` → `<TodoStoreProvider>` → `<TodoView>` in `app/todo-app.tsx`. `layout.tsx` untouched.
- [x] **Task 2 — Voice every rotatable surface via `useVoice`** (AC: #1, #3)
  - [x] All 14 surfaces voiced via `useVoice`: placeholder, add, empty, loading, saving, edit, save, edit-cancel, delete, delete-prompt, delete-confirm, delete-cancel, retry, dismiss.
  - [x] Action controls call `reroll()` on activation (Add on submit; Edit/Delete/Save/Confirm/Cancel/Retry/Dismiss on click).
  - [x] Transient surfaces are mounted-on-demand components (`VoicedMessage`, `LoadError`, `MutationBanner`, `DeleteConfirm`, `EditRow`, `PendingRow`) → pick fresh each appearance.
  - [x] Buttons: voiced visible text = accessible name (removed the per-row duplicate `aria-label`s). Text inputs keep stable `aria-label` (`New task`, `Edit task`).
  - [x] State/selection text unrotated (FR-17): checkbox `Completed: <text>`, confirm-group name, task text, timestamp unchanged.
- [x] **Task 3 — Voice errors via `error.code` on the client (AD-8)** (AC: #2)
  - [x] Store now carries the **code**: `TodoState` error → `{ status:"error"; code: ClientErrorCode }`; `mutationError`→`mutationErrorCode: ClientErrorCode | null`; load/mutation catch use `codeOf(err)` (`TodoApiError.code` or `"UNKNOWN"`). New exported `ClientErrorCode`.
  - [x] `app/todo-app.tsx` maps `ERROR_CODE_COPY[code] → useVoice(key).text` for load-error + mutation banner; raw server message never shown.
  - [x] Updated store unit tests to the code-based shape; optimistic behaviour untouched.
- [x] **Task 4 — Sort control copy + CSS ALL-CAPS** (AC: #1, #3)
  - [x] `FIXED_COPY` map in `lib/voice/catalog.ts` (non-rotating, clear): `sortLabel` + one per SortOrder value; `SortControl` sources them (FR-14/17/19). Sort select accessible name = visible voiced label; E2E via `data-testid="sort"`.
  - [x] `.voice { text-transform: uppercase }` + `.voice-quiet` (no transform for the delete-cancel quiet asides) + `main input::placeholder` uppercase. Contrast unaffected.
- [x] **Task 5 — Migrate E2E to `data-testid` + voiced-error assertions + hydration E2E** (AC: #4)
  - [x] `data-testid`s added: `add-task`, `sort`, `loading`, `empty-state`, `load-error`, `retry`, `mutation-error`, `dismiss`, `form-error`, `edit-error`, `saving`, and per-row `edit`/`delete`/`confirm-delete`/`cancel-delete`/`save`/`cancel-edit`. Migrated all specs' name/text locators; kept `getByLabel("New task"/"Edit task")`, `getByRole("checkbox")`, `role="alert"/"group"`.
  - [x] Error-path E2E now assert the surface is voiced (visible + NOT the raw server string) instead of the raw message.
  - [x] **NEW** `tests/e2e/voice.spec.ts`: no hydration console error; controls show catalog copy; error path shows a voiced (non-raw) message.
- [x] **Task 6 — "No hardcoded user-facing strings" guard + full regression** (AC: #1, #4)
  - [x] **NEW** `tests/unit/voice-wiring.test.ts`: asserts the old hardcoded phrases are gone from `app/todo-app.tsx` and that it sources copy via `useVoice`/`ERROR_CODE_COPY`/`FIXED_COPY`.
  - [x] Typecheck + lint clean; full Vitest green with `TEST_DATABASE_URL` (156); all E2E pass on both projects (56, +2 skipped). `fileParallelism:false` kept. No new deps.

## Dev Notes

### What this story does (FR-14/16/17/20 + AD-8/10 — the payoff of Epic 3)

Epics 1–2 built plain-English surfaces; 3.1 built the catalog; 3.2 built the rotation engine. **3.3 makes the app actually speak** — every user-facing string now comes from `useVoice`, rotating on load / on activation / on each appearance, LOUD via CSS, error codes voiced client-side, and accessible names kept sane by moving E2E to `data-testid`. This is the largest story in the epic; it touches the component, the store's error channel, the catalog (fixed sort copy), CSS, and the whole E2E suite.

### The accessible-name strategy (Epic 2 retro decision — implement it here)

Decided 2026-07-08: **voice everywhere; the voiced visible text IS the accessible name (WCAG 2.5.3)**, so no visible/label divergence; E2E control locators move to **`data-testid`**; voice-pack variants are unambiguous (FR-19) so rotating names stay clear. **State/selection-conveying names are the exception** (FR-17): the checkbox `Completed: <text>` and sort selection stay stable and unrotated. Text inputs keep their stable `aria-label` (`New task`, `Edit task`) since inputs are rotation-excluded.

### Error voicing design (AC #2 / AD-8)

The server returns a plain `{ error: { code, message } }` (AD-4) and `lib/todos-client` throws `TodoApiError` with `.code` (`ErrorCode | "UNKNOWN"`). Today the store stores the raw `message`. Change it to store the **code**; the component maps `ERROR_CODE_COPY[code] → useVoice(key).text`. `NOT_FOUND → notFoundError`, `UNKNOWN → networkError`, the rest → `genericError` (3.1 catalog). This is the client-side mapping AC #2 requires; the server stays plain. This is the one store change in the story — keep every optimistic/reconcile/rollback behaviour identical; only the error *representation* changes (message → code), plus the matching store unit-test updates.

### Files this story touches (read them first)

- **UPDATE `app/todo-app.tsx`** (current: fully hardcoded strings + per-row `aria-label`s + inline sort labels + raw `state.message`/`store.mutationError` display). This is the bulk of the wiring. Preserve behaviour (optimistic flows, single-editor, delete-confirm, disabled states) exactly; only swap copy → voice + add `data-testid`s + reroll-on-activation + map error codes.
- **UPDATE `lib/store/todo-store.tsx`** (error channel → code): `TodoState` error variant, `mutationError`→`mutationErrorCode`, load/mutation catch blocks capture `.code`. Keep the reducer's optimistic actions untouched.
- **UPDATE `lib/voice/catalog.ts`** (add fixed sort copy — `FIXED_COPY`/single-variant sort keys). **UPDATE `lib/store/sort.ts`** only if the option labels are sourced there.
- **UPDATE `app/globals.css`** (`.voice { text-transform: uppercase }` + exemptions).
- **UPDATE tests:** `tests/unit/todo-store.test.ts` (error shape), the E2E specs (locator migration + voiced-error assertions). **NEW:** `tests/e2e/voice.spec.ts`, `tests/unit/voice-wiring.test.ts`.

### Scope decision (2026-07-08)

**Wire existing surfaces only.** Do NOT build the new `completionToast` / `allTasksComplete` UI surfaces in this story — the app renders neither today, and adding them expands scope. Leave those catalog keys as available-but-unwired data for a possible follow-up. Everything else (all current surfaces, fixed sort copy, error voicing, CSS caps, data-testid migration) is in scope.

### Scope fences (do NOT build here)

- **No a11y audit / axe / WCAG sweep** → **Story 3.4** (this story keeps names sane and applies caps-via-CSS, but the formal audit + confirm-dialog focus-return/aria-live is 3.4).
- **No new voice keys beyond** the surfaces the app renders + the fixed sort copy. Don't add `completionToast`/`allTasksComplete` surfaces unless you also render them (the catalog has the copy; wiring a brand-new toast/all-done banner is optional — prefer NOT to add new surfaces here to keep scope bounded; if you skip them, leave the keys as available-but-unwired data).
- **No API/route/schema/repository changes.** **No new dependencies.** Voice stays out of code/logs/error codes/identifiers (AD-8).

### Architecture compliance (guardrails)

- **FR-14** all copy from the pack; **FR-16** rotation on load/activation/appearance, no back-to-back (engine from 3.2), checkbox/text-input excluded; **FR-17** never rotate state/selection text; **FR-18** bleeped (catalog); **FR-19** clarity; **FR-20** caps via CSS + stable/descriptive names.
- **AD-8** voice-scope boundary + client-side `error.code`→copy; **AD-9** use the 3.2 provider/`useVoice` (do NOT re-implement rotation); **AD-10** stable aria for state, WCAG-AA contrast; **AD-11** text still React-escaped; **AD-14** store still owns collection state (now error *codes*).

### Learnings carried from Epics 1–3.2 (apply them)

- **Use `useVoice` from 3.2** for all rotation (don't re-roll your own). Interactive controls call `reroll()` on activation; transient surfaces re-pick via mount (keep them as mounted-on-demand subtrees).
- **`data-testid` migration is the safety net** — do it comprehensively so the 50 existing E2E don't rely on rotating text. Preserve `role="alert"`/`role="group"` and the stable input `aria-label`s.
- **Error-code threading** mirrors the store's existing discriminated-union discipline; update the store unit tests in lockstep. The optimistic E2E (`optimistic.spec.ts`) currently assert raw messages (`"Delete failed"`, etc.) — switch to voiced-copy assertions.
- **FR-20 exemptions**: the `deleteCancelButton` lowercase asides + brand must not be uppercased — apply `.voice` selectively, not globally.
- **Test infra:** `fileParallelism:false`; Vitest with `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test`; E2E `webServer` reuses the running dev server; both Playwright projects. No new deps; Node 24.

### Latest tech information

- **React 19** context consumption via the 3.2 `useVoice`; controls re-roll by calling `reroll()` in `onClick`. Transient surfaces re-pick on mount (unmount/remount = fresh appearance).
- **CSS `text-transform: uppercase`** for the LOUD look (FR-20) — screen readers read the underlying natural-case DOM text, so ALL-CAPS is purely visual. Exempt specific keys with a separate class or by not applying `.voice`.
- **Playwright `getByTestId`** (default `data-testid` attribute) — stable across rotating copy; the recommended migration target.

### Project Structure Notes

- **NEW:** `tests/e2e/voice.spec.ts`, `tests/unit/voice-wiring.test.ts`.
- **UPDATE:** `app/todo-app.tsx`, `lib/store/todo-store.tsx`, `lib/voice/catalog.ts`, `lib/store/sort.ts` (maybe), `app/globals.css`, `tests/unit/todo-store.test.ts`, and the affected E2E specs (`states.spec.ts`, `optimistic.spec.ts`, `sort.spec.ts`, `responsive.spec.ts`, `create-view.spec.ts`, `edit-*.spec.ts`, `toggle-complete.spec.ts`, `delete-with-confirm.spec.ts`, `validation.spec.ts`).
- **PRESERVE:** API/repository/schema, the store's optimistic/sort behaviour, and all non-copy behaviour.

### References

- [Source: planning-artifacts/epics.md#Story-3.3] ACs + tests (no hardcoded strings; controls re-roll; error.code→voiced; lint/E2E)
- [Source: planning-artifacts/epics.md#FR-14..FR-20] voice pack, rotation, state-text, bleeped, clarity, caps-via-CSS + stable names
- [Source: planning-artifacts/architecture/*ARCHITECTURE-SPINE*.md#AD-8] client maps error.code→copy, voice-scope; [#AD-9] provider/selector (from 3.2); [#AD-10] a11y; [#AD-14] store ownership
- [Source: lib/voice/*] catalog (`VOICE_CATALOG`, `ERROR_CODE_COPY`), rotation (`nextVariantIndex`, controller), provider (`VoiceProvider`, `useVoice`) — the 3.1/3.2 building blocks
- [Source: app/todo-app.tsx] every surface to wire; [Source: lib/store/todo-store.tsx] the error channel to thread codes through; [Source: lib/store/sort.ts] SORT_OPTIONS labels
- [Source: implementation-artifacts/sprint-status.yaml action_items epic:2] the accessible-name decision (data-testid + voiced names)
- [Source: implementation-artifacts/deferred-work.md] sort-label voicing (3.1 defer); provider hydration E2E (3.2 defer); the 3.3 flags (VALIDATION_ERROR mapping, confirm-label clarity)
- [Source: _bmad-output/project-context.md] voice everywhere, scope boundary, no new deps

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run typecheck` / `npm run lint` — clean.
- `TEST_DATABASE_URL=… npx vitest run` — **156 passed** (was 154; +voice-wiring guard; store error-shape tests updated).
- `npx playwright test` — **56 passed, 2 skipped** (both projects); the whole suite migrated from name/text locators to `data-testid`.

### Completion Notes List

- **The app now speaks Torgue everywhere (FR-14).** Every button/message/placeholder in `app/todo-app.tsx` renders `useVoice(key).text`; action controls `reroll()` on activation; transient surfaces (`VoicedMessage`, `LoadError`, `MutationBanner`, `DeleteConfirm`, `EditRow`, `PendingRow`) are mounted-on-demand so they pick a fresh variant each appearance (FR-16).
- **Accessible-name strategy (retro decision) implemented:** voiced visible text IS the accessible name (WCAG 2.5.3) — the duplicate per-row `aria-label`s were removed; E2E now locate controls via `data-testid`. State/selection names stay stable + unrotated (checkbox `Completed: <text>`, sort selection) per FR-17; text inputs keep stable `aria-label`s.
- **Client-side error voicing (AD-8):** the store carries the error **code** (`ClientErrorCode`; `TodoState.error.code`, `mutationErrorCode`) via `codeOf(err)`; the UI maps `ERROR_CODE_COPY[code] → useVoice` — the raw server message is never shown. Optimistic reconcile/rollback behaviour is unchanged.
- **Sort copy (3.1 deferral):** non-rotating `FIXED_COPY` (clear about ordering, FR-19/17) for the sort label + options.
- **FR-20:** ALL-CAPS via CSS `.voice` (with `.voice-quiet` exempting the lowercase delete-cancel asides, and `::placeholder` uppercasing); copy stored natural-case.
- **E2E migration:** all specs moved off rotating text/name locators to `data-testid`; error-path specs now assert voiced (non-raw) copy; new `voice.spec.ts` checks hydration + voiced copy + voiced errors; new unit guard forbids hardcoded strings.
- **Scope:** existing surfaces only (per the recorded decision) — completionToast/allTasksComplete left as available-but-unwired catalog data. No API/schema/deps changes.

### File List

- `app/todo-app.tsx` — UPDATE (full voice wiring; VoiceProvider; VoicedMessage/LoadError/MutationBanner/SortControl/EditRow/DeleteConfirm; data-testids; error-code mapping)
- `lib/store/todo-store.tsx` — UPDATE (error channel → `ClientErrorCode`; `mutationErrorCode`; `codeOf`)
- `lib/voice/catalog.ts` — UPDATE (`FIXED_COPY` sort copy)
- `app/globals.css` — UPDATE (`.voice`/`.voice-quiet`, `::placeholder` uppercase)
- `tests/unit/todo-store.test.ts` — UPDATE (error-code shape)
- `tests/unit/voice-wiring.test.ts` — NEW (no-hardcoded-strings guard)
- `tests/e2e/voice.spec.ts` — NEW (hydration + voiced copy + voiced error)
- `tests/e2e/{states,validation,sort,optimistic,responsive,create-view,edit-in-place,edit-cancel,toggle-complete,delete-with-confirm}.spec.ts` — UPDATE (data-testid migration + voiced-error assertions)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-08 | Story 3.3 implemented (review): full voice wiring, client error-code voicing, fixed sort copy, CSS caps, E2E migrated to data-testid + new voice.spec + no-hardcoded-strings guard. 156 Vitest, 56 E2E. |
| 2026-07-08 | bmad-tea automate: +2 E2E (sort options = FIXED_COPY; ALL-CAPS is CSS-only with quiet-aside exempt). 156 Vitest, 60 E2E. |
| 2026-07-08 | Code review (adversarial 3-layer): 2 patches — EditRow Save/Cancel reroll; voiced app title (`AppTitle`, `<h1>` removed from page.tsx). 2 deferred to Story 3.4 (per-task accessible names for rotating controls; variant-0 flash). 3 dismissed. 156 Vitest, 60 E2E. Status → done. |

### Review Findings (2026-07-08, adversarial 3-layer)

Auditor: faithful except two gaps. Blind + Edge grounded, mostly a11y-of-rotating-copy (→ Story 3.4).

Patch (both applied 2026-07-08):

- [x] [Review][Patch] Save & edit-Cancel reroll — FIXED: `EditRow` Save/Cancel now call `reroll()` on click (consistent with all other controls, FR-16). [app/todo-app.tsx EditRow]
- [x] [Review][Patch] App title voiced — FIXED: `<h1>BeMad</h1>` removed from `page.tsx`; new client `AppTitle` renders `useVoice("appTitle")` inside `VoiceProvider` (FR-14; `data-testid="app-title"`). [app/page.tsx, app/todo-app.tsx]

Defer:

- [x] [Review][Defer] Per-row Edit/Delete lost task-specific accessible names (voiced visible text = accessible name dropped the old `Delete: <task>` context; SR users browsing by button lose task context) — deferred to Story 3.4 (accessibility of rotating copy, WCAG 2.2 AA) as its TOP item: decide how rotating controls carry per-task context (e.g. accessible name = `${voiced}: ${task}`, or a visually-hidden task reference) and audit with axe [app/todo-app.tsx]
- [x] [Review][Defer] Variant-0 first-paint flash on interaction-only-mounted voiced surfaces (edit form, delete-confirm, banners) — the provider's post-hydration effect is needed for SSR'd surfaces but flickers client-only ones; a provider seeding enhancement. Deferred (3.4/polish) [lib/voice/provider.tsx]

Dismissed (3): FR-11 "not saved yet" throw is unreachable via the UI (pending rows render no mutate controls; defensive only); validation NUL-misclassification (obscure paste edge, no NUL-specific key — Low); the two validation E2E now assert surface-visibility (acceptable — voiced/rotating copy; `voice.spec` asserts catalog membership for errors).
| 2026-07-08 | Story 3.3 drafted (ready-for-dev): wire every surface to `useVoice` (rotate on load/activation/appearance), voiced visible text = accessible name (WCAG 2.5.3) with state/selection names kept stable (FR-17); client `error.code`→voiced via the store carrying codes (AD-8); fixed voiced sort copy (3.1 defer); ALL-CAPS via CSS (FR-20) with quiet-aside/brand exemptions; E2E migrated to `data-testid` + voiced-error assertions + new hydration/voice E2E; no-hardcoded-strings guard. No API/deps changes. |
