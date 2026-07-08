---
baseline_commit: 88f3d269370c73abb2a27af1b9a0669ed8ca857d
---

# Story 3.1: Voice pack module & variant catalog

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app's text to sound like Mr. Torgue,
so that using it is fun and memorable.

## Acceptance Criteria

1. **Given** the voice pack in `lib/voice`, **when** copy is needed, **then** every user-facing string is defined as a **key mapping to ~5 semantically-identical variants** (seeded from the brief addendum's voice guide), profanity **bleeped** (`F***`, `S***`), each variant **unambiguously conveying its action** (FR-14, FR-15, FR-18, FR-19).
2. **And** the voice is **confined to user-facing copy** — API field names, `error.code` values, logs, and identifiers stay plain (voice-scope boundary, AD-8).
3. **And** copy is stored in **natural case** (not ALL-CAPS): the LOUD styling is applied via CSS `text-transform` in Story 3.3, so assistive tech reads normally (FR-20). Intentional lowercase "quiet aside" variants are preserved as-is.
4. **And** this story ships the **catalog + module only** — the deterministic rotation selector is Story 3.2 and wiring surfaces to the pack is Story 3.3. No component/API changes here.

## Tasks / Subtasks

- [x] **Task 1 — Voice catalog module (`lib/voice/catalog.ts`)** (AC: #1, #2, #3)
  - [x] `VoiceKey` union of 22 keys covering current app surfaces + likely 3.3 surfaces (appTitle, completionToast, allTasksComplete) + error copy.
  - [x] `VOICE_CATALOG: Record<VoiceKey, readonly string[]>` — 5 variants each (110 total), seeded from the addendum guide; `Record<VoiceKey,…>` gives compile-time exhaustiveness.
  - [x] Natural case throughout (no stored ALL-CAPS); `deleteCancelButton` lowercase "quiet aside" variants preserved + flagged for 3.3 no-uppercase.
  - [x] Strong profanity bleeped (`s***`); mild ("dammit") kept; variants semantically interchangeable + unambiguous (FR-19).
- [x] **Task 2 — Error-code → voice mapping (AD-8, client-side only)** (AC: #2)
  - [x] `ERROR_CODE_COPY: Record<ErrorCode | "UNKNOWN", VoiceKey>` maps all 4 `lib/http` codes + client `"UNKNOWN"` → catalog keys (NOT_FOUND→notFoundError, UNKNOWN→networkError, rest→genericError).
  - [x] No server/route/schema/`lib/http`/`lib/todos-client` changes — data declaration only.
- [x] **Task 3 — Bleep guard + public surface (`lib/voice/index.ts`)** (AC: #1)
  - [x] `PROFANITY_DENYLIST` + pure `hasUnbleepedProfanity(text)` (word-boundary, case-insensitive) in `lib/voice/bleep.ts`.
  - [x] `lib/voice/index.ts` placeholder replaced with `export * from ./catalog` + `./bleep`. `lib/voice` stays pure data/helpers (no React/rotation/DOM).
- [x] **Task 4 — Tests (`tests/unit/voice-catalog.test.ts`)** (AC: #1, #2, #3)
  - [x] ≥5 variants/key; no blank; no intra-key dupes.
  - [x] No un-bleeped profanity across all variants + guard self-test (detects "shit", ignores "s***"/"dammit").
  - [x] Natural-case heuristic: every variant has a lowercase letter (catches stored ALL-CAPS).
  - [x] Error-code coverage: all 5 codes map to real catalog keys; no extra codes.
  - [x] Snapshot of `VOICE_CATALOG`.
  - [x] Typecheck + lint clean; full Vitest green with `TEST_DATABASE_URL` (140); all existing tests pass (50 E2E). `fileParallelism:false` kept.

## Dev Notes

### What this story adds (FR-14/15/18/19 — the catalog, on the Epic 1–2 app)

Epic 3's differentiator is the Torgue voice. This first story builds the **single source of copy** — a typed catalog of keys → ~5 variants — with profanity bleeped and every variant clear. It is **pure data + pure helpers**: no rotation (Story 3.2), no wiring/provider (Story 3.3), no component or API changes. It replaces the `lib/voice/index.ts` scaffold placeholder.

- **The variants are already drafted** in `_bmad-output/planning-artifacts/briefs/brief-BeMad-2026-07-02/addendum.md` §2 ("Voice & Copy Guide"). Seed the catalog from there, **de-capitalised to natural case** (FR-20) and mapped to the app's actual surfaces below. Treat the guide's sets as the starting point; ensure ≥5 clear, bleeped variants each.

### Voice-scope boundary (AD-8) — do NOT cross it

The voice lives **only** in this user-facing copy catalog. It must NOT touch: API field names, `error.code` strings, HTTP bodies, logs (`console.error`), DB, identifiers, or code. `ERROR_CODE_COPY` is the **client-side** bridge from a plain server `error.code` to a voiced key — the server stays plain. (This is why the store/client already carry plain `error.code`/messages — 3.3 will translate them.)

### FR-20 casing decision (important)

Store copy in **natural case**. ALL-CAPS is a **display** concern applied via CSS `text-transform: uppercase` in Story 3.3 — storing shouty strings makes screen readers spell them out letter-by-letter (accessibility failure) and is explicitly forbidden by FR-20. Two carve-outs to document for 3.3:
- The **delete-cancel** "quiet aside" variants (`uh, nevermind`, `wait, no`, …) are deliberately lowercase and must be **exempt from uppercasing** in 3.3.
- The **brand** "BeMad" (if an app-title key is included) is a proper noun — 3.3 should not uppercase it to "BEMAD".

### Key catalog (map to today's real surfaces)

Define a `VoiceKey` for each surface the current UI renders (`app/todo-app.tsx`), seeded from the addendum:

| VoiceKey | Surface (current app) | Addendum source |
| -------- | --------------------- | --------------- |
| `addPlaceholder` | New-task input placeholder (`What needs doing?`) | Add-task input placeholder |
| `addButton` | Add-task submit button (`Add task`) | Add button |
| `emptyState` | Empty list (`No tasks yet.`) | Empty state |
| `loadingState` | Loading (`Loading…`) | Loading state |
| `savingPending` | Pending optimistic row (`Saving…`) | (new — brief loading-flavoured, short) |
| `editButton` | Row Edit button | Edit button |
| `saveButton` | Edit-mode Save button | Edit save button |
| `editCancelButton` | Edit-mode Cancel button | (Torgue "nevermind"-style, but normal case ok) |
| `deleteButton` | Row Delete button | Delete button |
| `deleteConfirmPrompt` | Inline confirm message (`Delete this task?`) | Delete confirmation (message) |
| `deleteConfirmButton` | Confirm-delete button (`Confirm`) | Delete confirm labels |
| `deleteCancelButton` | Cancel-delete button (`Cancel`) — **quiet lowercase asides** | Delete cancel labels |
| `retryButton` | Load-error Retry button | Retry button |
| `dismissButton` | Mutation-error banner Dismiss button | (new — short "shrug it off" set) |
| `genericError` | Mutation-error fallback / generic failure | Generic error |
| `networkError` | Save/network failure copy | Network / save failure |
| `notFoundError` | Server 404 on mutate (task vanished) | (new — "that task ghosted us" set) |
| `validationEmpty` | Client/serverempty-text rejection (FR-9) | (new — "SAY SOMETHING" set, clear) |
| `validationTooLong` | >1000 code-point rejection (FR-9) | (new — "TOO MUCH POWER, trim it" set, clear) |

Optional/future keys (the addendum provides copy; include only if you also intend them to be wired later — otherwise leave out to avoid dead keys): `appTitle`, `completionToast`, `allTasksComplete`. **Recommendation:** include `appTitle`, `allTasksComplete`, `completionToast` in the catalog (the guide has them and they're likely Story 3.3 surfaces), but it's acceptable to omit if you prefer no unused keys — the ≥5-variants test applies to whatever is declared.

**Not voiced (leave plain / out of the catalog):** task text + timestamp (user data), the checkbox (a **state** control — FR-16 excludes checkbox; FR-17 forbids rotating state text; its `Completed: <text>` accessible name stays stable), and the sort-option labels + "Sort tasks" (they convey **current selection** → FR-17; keep stable, decide in 3.3 whether to give them a single voiced-but-fixed label). Document these exclusions.

### The Epic 2 retro decision to honour (accessible names)

Retro decision (2026-07-08): **voice everywhere — visible text IS the accessible name (WCAG 2.5.3)**; Story 3.3 will migrate E2E control locators to `data-testid` and keep voice-pack variants unambiguous (FR-19) so rotating names stay clear. **This story doesn't change any accessible name yet** (catalog only), but write the variants so that *any* of them works as a clear standalone accessible name for its control (FR-19/FR-20) — that's what makes 3.3's approach safe.

### Scope fences (do NOT build here)

- **No rotation logic** (`(key, lastShownIndex, rng)` selector) → **Story 3.2**. **No provider/wiring/`data-testid`/CSS uppercasing** → **Story 3.3**. **No a11y audit** → **Story 3.4**.
- **No component, API, route, schema, `lib/http`, `lib/todos-client`, or store changes.** Only new files under `lib/voice` + `tests/unit`, and replacing the `lib/voice/index.ts` placeholder.
- **No new dependencies.**

### Architecture compliance (guardrails)

- **AD-8:** single centralized voice pack; client maps `error.code` → voiced copy (declare the mapping here; server stays plain). **FR-14:** all user-facing copy sourced here; **FR-15:** ~5 variants/key; **FR-18:** bleeped; **FR-19:** unambiguous; **FR-20:** caps via CSS (store natural case) + accessible names handled in 3.3.
- **AD-13 test floor:** unit tests for the catalog (variant count, bleep guard, error-code coverage, snapshot).
- Keep `lib/voice` pure (no React/DOM/rotation) — clean seam for 3.2 (selector) and 3.3 (provider).

### Learnings carried from Epics 1–2 (apply them)

- **Pure module + rich unit tests** (the reducer/`sortEntries` pattern) — the catalog + bleep helper are pure and fully unit-testable; no DOM harness needed.
- **`Record<Union, …>` for exhaustiveness** so adding a surface later forces a catalog entry (compile error otherwise) — mirrors the discriminated-union discipline used in the store.
- **`ErrorCode` lives in `lib/http`** (`VALIDATION_ERROR | INVALID_JSON | NOT_FOUND | INTERNAL`); the client wrapper adds `"UNKNOWN"` (`lib/todos-client.ts`). Cover all of them in `ERROR_CODE_COPY`.
- **Test infra:** `fileParallelism:false`; run Vitest with `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test`; no new deps; Node 24. This story adds no E2E (no rendered surface yet) — E2E for voiced surfaces arrives in 3.3.

### Latest tech information

- **TypeScript string-literal unions + `Record<Key, readonly string[]>`** give compile-time exhaustiveness and `as const` immutability — no library needed.
- **Bleep guard** = a small regex/word-boundary check against an uncensored-token denylist; keep it pure and exported so 3.3 can reuse it as a lint/guard against un-bleeped hardcoded copy.
- **Snapshot testing** via Vitest `toMatchSnapshot()` (or an inline sorted-keys assertion) to make copy changes reviewable.

### Project Structure Notes

- **NEW:** `lib/voice/catalog.ts` (VoiceKey, VOICE_CATALOG, ERROR_CODE_COPY), possibly `lib/voice/bleep.ts` (denylist + helper) or fold into catalog, `tests/unit/voice-catalog.test.ts`.
- **UPDATE:** `lib/voice/index.ts` (replace `export {}` placeholder with re-exports).
- **PRESERVE:** everything else — no behaviour changes; the full existing suite stays green.

### References

- [Source: planning-artifacts/epics.md#Story-3.1] ACs + tests (≥5 variants/key; no un-bleeped profanity; catalog snapshot)
- [Source: planning-artifacts/epics.md#FR-14..FR-20] voice pack, variants, rotation (3.2), state-text (3.3), bleeping, clarity, caps-via-CSS + stable names
- [Source: planning-artifacts/briefs/brief-BeMad-2026-07-02/addendum.md §2] the Mr. Torgue voice & copy guide with ~5 variants per key — the seed for the catalog (de-cap to natural case)
- [Source: planning-artifacts/architecture/*ARCHITECTURE-SPINE*.md#AD-8] voice pack module; client maps error.code → voiced copy; [#AD-9] rotation (Story 3.2); [#AD-10] a11y (caps via CSS, stable names)
- [Source: lib/http.ts] `ErrorCode` union to map; [Source: lib/todos-client.ts] `"UNKNOWN"`/`TodoApiError`; [Source: app/todo-app.tsx] the surfaces to key
- [Source: implementation-artifacts/sprint-status.yaml action_items epic:2] the accessible-name decision 3.3 will implement
- [Source: _bmad-output/project-context.md] voice-scope boundary (plain code/logs/errors), no new deps, single voice pack

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run typecheck` / `npm run lint` — clean.
- `TEST_DATABASE_URL=… npx vitest run` — **140 passed** (was 131; +9 voice-catalog).
- `npx playwright test` — **50 passed, 2 skipped**. One transient failure (edit-in-place) on the first full run, passed on isolated + subsequent full runs — pre-existing real-DB parallel-contention flake (Epic 1 action item "E2E test-DB isolation"), not caused by this pure-data story.

### Completion Notes List

- **Pure-data voice catalog (AD-8 / FR-14/15/18/19/20).** `lib/voice/catalog.ts` defines `VoiceKey` (22 keys) + `VOICE_CATALOG` (5 natural-case variants each, 110 total) seeded from the brief addendum voice guide, + `ERROR_CODE_COPY` (client-side error.code→key map). `lib/voice/bleep.ts` has the denylist + pure `hasUnbleepedProfanity`. `lib/voice/index.ts` re-exports both (placeholder removed). No React/rotation/DOM — clean seam for 3.2 (selector) and 3.3 (provider/wiring).
- **FR-20 honored:** copy stored in natural case; ALL-CAPS is deferred to CSS `text-transform` in 3.3. The `deleteCancelButton` lowercase "quiet aside" variants are preserved and flagged for no-uppercase in 3.3; `appTitle` brand "BeMad" likewise needs proper-noun handling in 3.3.
- **Voice-scope boundary (AD-8):** the catalog is the only voice home; server codes/messages/logs stay plain. `ERROR_CODE_COPY` is the client-side bridge 3.3 will use — no server change here.
- **FR-18 bleeping** enforced by both pre-bleeped strings and the `hasUnbleepedProfanity` guard test (strong tokens denylisted; mild "dammit" allowed, matching the guide).
- **Scope:** catalog only. Rotation (3.2), provider/wiring/`data-testid`/CSS uppercasing (3.3), a11y audit (3.4) intentionally NOT built. No component/API changes; no new deps.
- **Included forward-looking keys** (`appTitle`, `completionToast`, `allTasksComplete`) the guide provides and 3.3 is likely to wire; if any go unused they're harmless data.

### File List

- `lib/voice/catalog.ts` — NEW (VoiceKey, VOICE_CATALOG, ERROR_CODE_COPY)
- `lib/voice/bleep.ts` — NEW (PROFANITY_DENYLIST, hasUnbleepedProfanity)
- `lib/voice/index.ts` — UPDATE (placeholder → re-export catalog + bleep)
- `tests/unit/voice-catalog.test.ts` — NEW (structure, bleep, natural-case, error-code, control-label conciseness, snapshot)
- `tests/unit/__snapshots__/voice-catalog.test.ts.snap` — NEW (catalog snapshot)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-08 | Story 3.1 drafted (ready-for-dev): typed `lib/voice` catalog (VoiceKey → ≥5 natural-case, bleeped, unambiguous variants) seeded from the brief addendum voice guide; client-side `ERROR_CODE_COPY` mapping (AD-8, server stays plain); bleep denylist + pure guard; unit tests (variant count, bleep, error-code coverage, snapshot). Catalog only — rotation is 3.2, wiring is 3.3. |
| 2026-07-08 | Story 3.1 implemented (review): `lib/voice/{catalog,bleep,index}.ts` (22 keys × 5 variants, ERROR_CODE_COPY, bleep guard); 9 unit tests + snapshot. 140 Vitest, 50 E2E. |
| 2026-07-08 | bmad-tea automate: +1 unit guard (control-label variants ≤40 chars/single-line — usable as rotating accessible names per the retro decision). 141 Vitest. |
| 2026-07-08 | Code review (adversarial 3-layer): Auditor no violations. 3 patches applied — bleep guard now catches inflections, adjacent-control duplicate variant fixed, natural-case test strengthened. 1 defer (sort-label voice keys → Story 3.3). 4 dismissed/flagged. 141 Vitest, 50 E2E. Status → done. |

### Review Findings (2026-07-08, adversarial 3-layer)

Acceptance Auditor: no true AC violations. Hunters found guard/test-quality issues + one coverage gap.

Patch (all applied 2026-07-08):

- [x] [Review][Patch] Bleep guard inflections — FIXED: dropped the trailing `\b`, so stems match within words (`fucking`/`shitty`/`bitches` now caught); self-test extended with inflection + compound cases. [lib/voice/bleep.ts, tests/unit/voice-catalog.test.ts]
- [x] [Review][Patch] Adjacent-control duplicate variant — FIXED: `deleteConfirmButton`'s `"Blow it up"` → `"Detonate it"` (no longer collides with `deleteButton`). [lib/voice/catalog.ts]
- [x] [Review][Patch] Natural-case test strengthened — FIXED: now also rejects consecutive ALL-CAPS words (`/[A-Z]{2,}\s+[A-Z]{2,}/`), catching "ADD IT now"-style shoutiness (FR-20). [tests/unit/voice-catalog.test.ts]

Defer:

- [x] [Review][Defer] Sort control labels (`Sort tasks` + 4 option labels) have no voice key — deferred to Story 3.3: sort labels convey current SELECTION so per FR-17 they must NOT rotate; they don't fit the ≥5-rotating-variant catalog and need a fixed/single-variant voiced-copy mechanism. 3.3 must source them from the pack (FR-14), not hardcode. [lib/voice/catalog.ts, lib/store/sort.ts]

Dismissed / flagged for 3.3 (4): "complete a task" label key absent (deliberate — completion control is a checkbox = plain state control, correctly not voiced); snapshot "adds no value" (intentional copy change-detector, committed with the story); FR-19 borderline confirm-label clarity (verbatim from guide, finalize in 3.3); `VALIDATION_ERROR→genericError` (acceptable; 3.3 to ensure server-side FR-9 rejections still read as validation).
