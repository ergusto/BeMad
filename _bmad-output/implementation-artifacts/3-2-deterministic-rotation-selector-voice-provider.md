---
baseline_commit: 23926d276323b5e27a9f10dbf8af709a708be3d7
---

# Story 3.2: Deterministic rotation selector & voice provider

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the copy to keep changing so it never feels stale,
so that the app stays fresh on repeat use.

## Acceptance Criteria

1. **Given** the rotation selector, **when** a variant is requested for a key, **then** selection is a **pure function** of `(variantCount, lastShownIndex, rng)` with an **injected RNG** — it **never repeats the same variant twice in a row** and keeps **all variants reachable** (AD-9, FR-16).
2. **And** one client-side **voice provider** owns **per-key rotation state**, and selection happens **after hydration** (no SSR/hydration mismatch) (AD-9).
3. **And** rotation **never alters text that conveys current state or selection** (FR-17) — the provider is only for rotatable copy; state/selection-conveying text is not routed through it.
4. **And** this story ships the **engine only** (pure selector + rotation controller + provider/hook). Wiring surfaces to it + the real-browser hydration check land in **Story 3.3**. No component/API changes; no new dependencies.

## Tasks / Subtasks

- [x] **Task 1 — Pure rotation selector (`lib/voice/rotation.ts`)** (AC: #1)
  - [x] `nextVariantIndex(count, lastIndex, rng)` — pure; `count<=1`→0; else an index ≠ lastIndex from the other candidates via `rng()`; all reachable.
  - [x] Edge inputs: `count===0`→0; null/out-of-range `lastIndex`→any in-range; never returns `lastIndex` when `count>1`. No `Math.random` inside.
- [x] **Task 2 — Per-key rotation controller (`lib/voice/rotation.ts`)** (AC: #1, #2)
  - [x] `createRotationController(rng)` owns a per-key `lastIndex` map; `pick(key,count)` selects+records; consecutive picks for a key never repeat; keys independent. Pure core, unit-tested without a DOM harness.
- [x] **Task 3 — Voice provider + hook (`lib/voice/provider.tsx`, `"use client"`)** (AC: #2, #3)
  - [x] `VoiceProvider` holds one controller via a lazy `useState` initializer (once), injectable `rng` prop (default `Math.random`).
  - [x] `useVoice(key)` returns `{ text, reroll }`; SSR-safe first render = variant 0; mount effect performs the post-hydration first rotation (no mismatch); `reroll()` picks a fresh variant for interactive controls.
  - [x] Throws outside `VoiceProvider` (mirrors `useTodoStore`). No surface wired; no state/selection text routed through it (FR-17).
- [x] **Task 4 — Tests** (AC: #1, #2, #3)
  - [x] **NEW** `tests/unit/voice-rotation.test.ts` — selector: no back-to-back repeat, `count===1`→0, reachability, deterministic (seeded mulberry32), edge inputs, 2-variant alternation; controller: per-key no-repeat, key independence, reachability, deterministic, `pickExcluding` (per-surface no-repeat incl. the review-bug repro). (13 tests, seeded RNG helper — no `Math.random`.)
  - [x] Typecheck + lint clean; full Vitest green with `TEST_DATABASE_URL` (150); all existing tests pass (50 E2E). `fileParallelism:false` kept.
  - [x] **Deferred to Story 3.3:** the render-based "no hydration warning" check runs as a Playwright E2E once the provider wraps the real app (noted; no jsdom/RTL dependency added here).

## Dev Notes

### What this story adds (AD-9 rotation engine, on the 3.1 catalog)

Story 3.1 shipped the pure copy catalog. Story 3.2 adds the **engine that picks which variant to show**: a pure selector, a per-key rotation controller, and a thin client-side React provider/hook. It renders **nothing** into the app — Story 3.3 wires surfaces to `useVoice`. Keeping the pickable logic pure means it's fully unit-testable without a DOM harness (no new deps), and the only React piece (`useVoice`) is a thin binding whose render/hydration behaviour is verified in 3.3's real-browser E2E.

- **Baseline (3.1, committed):** `lib/voice/{catalog,bleep,index}.ts` — `VOICE_CATALOG: Record<VoiceKey, readonly string[]>` (≥5 variants/key), `ERROR_CODE_COPY`, bleep guard. Pure data; `index.ts` re-exports. No rotation, no provider yet.
- **After 3.2:** `lib/voice/rotation.ts` (pure `nextVariantIndex` + `createRotationController`) and `lib/voice/provider.tsx` (`VoiceProvider` + `useVoice`), re-exported from `lib/voice/index.ts`. Still no surface wired.

### Design rules (implement exactly)

- **Pure, injected RNG (AD-9/FR-16):** the selector takes `rng: () => number`; no `Math.random` inside the pure functions. The provider supplies `Math.random` by default and accepts an `rng` prop for deterministic tests. Never-repeat-back-to-back + all-reachable are properties of the pure selector, tested with a seeded RNG.
- **Per-key state in one provider (AD-9):** the controller owns a `Record<VoiceKey, lastIndex>` map; `pick(key,…)` reads+updates that key's lastIndex. Two surfaces using the same key in one render pass pick sequentially (different variants — nice variety); the same key never repeats back-to-back.
- **No SSR/hydration mismatch (AC #2):** first render (server + first client paint) returns variant index `0` deterministically; the rotation happens in a **mount effect** (client-only), not during render. This is the standard pattern — a brief index-0→rotated swap on load is expected and acceptable ("selection after hydration"). Do NOT call `Math.random`/rotate during render.
- **FR-17 boundary:** the provider is for **rotatable** copy only. Text that conveys current state or selection (completion status, which sort is active, a specific error's meaning) must NOT be rotated — 3.3 enforces this at the wiring sites; 3.2 just must not bake any state logic into the provider.

### Scope fences (do NOT build here)

- **No surface wiring** (buttons/messages/`data-testid`/CSS uppercasing) → **Story 3.3**. **No a11y audit** → **Story 3.4**. **No sort-label voicing** (deferred from 3.1) → **Story 3.3**.
- **No new dependencies** — no React Testing Library / jsdom / happy-dom in this story. The pure logic is unit-tested directly; the render/hydration check is a 3.3 Playwright E2E. (The recurring "component-test harness" action item stays deferred; Playwright covers the render concern.)
- **No component, API, route, schema, store, or catalog changes.** Only new files under `lib/voice` + a unit test, and re-exporting from `lib/voice/index.ts`.

### Architecture compliance (guardrails)

- **AD-9:** deterministic rotation selector with injected RNG; one client voice provider owns per-key rotation state; selection post-hydration.
- **FR-16:** variant per surface on load; interactive controls re-roll on activation (`reroll()` — invoked in 3.3); no back-to-back repeat; all variants reachable. **FR-17:** never rotate state/selection text (provider stays state-agnostic).
- **AD-14 pattern:** pure core + thin React binding + context hook that throws outside its provider (like `useTodoStore`). Keep `lib/voice` otherwise pure.

### Learnings carried from Epics 1–3.1 (apply them)

- **Extract the pure core** (`nextVariantIndex` + controller) so the logic is unit-testable without a DOM harness — the exact pattern that made the reducer and `sortEntries` testable and avoided the still-deferred RTL dependency.
- **Context hook throws outside provider** (`useTodoStore` precedent). **Mounted/post-hydration effects** for client-only work (the store's load pattern) — reuse the discipline to keep selection out of render.
- **Seeded RNG in tests** (deterministic) — the workflow bans `Math.random` in some tooling; here just inject a small seeded PRNG in the test for reproducibility. App code may use `Math.random` at runtime (post-hydration only).
- **Test infra:** `fileParallelism:false`; run Vitest with `TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test`; no new deps; Node 24. No E2E added here (provider unrendered); 3.3 adds voiced-surface + hydration E2E.

### Latest tech information

- **React 19 hydration:** avoid mismatches by rendering a deterministic value on the server/first paint and doing randomized selection in `useEffect` (client-only). `useSyncExternalStore` is an option for external state but is unnecessary here — a `useRef` controller + `useState` current-index per hook instance is simpler and sufficient.
- **Pure PRNG for tests:** a 1-line `mulberry32(seed)` gives a deterministic `() => number` in `[0,1)` — no dependency.
- **No new libraries** — React context + refs + a pure selector cover AD-9 entirely.

### Project Structure Notes

- **NEW:** `lib/voice/rotation.ts` (`nextVariantIndex`, `createRotationController`), `lib/voice/provider.tsx` (`VoiceProvider`, `useVoice`), `tests/unit/voice-rotation.test.ts`.
- **UPDATE:** `lib/voice/index.ts` (re-export rotation + provider).
- **PRESERVE:** the 3.1 catalog + everything else — no behaviour change; the full existing suite stays green.

### References

- [Source: planning-artifacts/epics.md#Story-3.2] ACs + tests (pure selector, injected RNG, no back-to-back, reachable, one provider, post-hydration, no state-text rotation; unit + integration-no-hydration-warning)
- [Source: planning-artifacts/epics.md#FR-16] rotation rules; [#FR-17] never rotate state/selection text
- [Source: planning-artifacts/architecture/*ARCHITECTURE-SPINE*.md#AD-9] deterministic rotation selector (injected RNG), one client voice provider owns per-key rotation state, select post-hydration; [#AD-14] single-owner + hook-throws pattern to mirror
- [Source: lib/voice/catalog.ts] `VOICE_CATALOG`/`VoiceKey` the provider maps over; [Source: lib/store/todo-store.tsx] `useTodoStore` provider/hook + post-mount effect patterns to mirror
- [Source: implementation-artifacts/3-1-voice-pack-module-variant-catalog.md] the catalog baseline; [deferred-work.md] sort-label voicing + 3.3 flags
- [Source: _bmad-output/project-context.md] deterministic rotation, no SSR mismatch, no new deps

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- `npm run typecheck` / `npm run lint` — clean (after two React 19 lint fixes below).
- `TEST_DATABASE_URL=… npx vitest run` — **150 passed** (was 141; +9 rotation).
- `npx playwright test` — 50 passed, 2 skipped (unchanged; provider not yet rendered).
- Two strict `react-hooks` lint rules hit legitimate patterns: (1) `react-hooks/refs` on lazy ref-init → switched to a lazy `useState(() => createRotationController(rng))`; (2) `react-hooks/set-state-in-effect` on the post-hydration rotation → narrowly `eslint-disable`d with justification (setState-in-mount-effect is the correct way to randomize after hydration without a mismatch).

### Completion Notes List

- **Rotation engine (AD-9), pure core + thin React binding.** `lib/voice/rotation.ts`: `nextVariantIndex(count,lastIndex,rng)` (pure, injected RNG, no back-to-back repeat, all reachable) + `createRotationController(rng)` (per-key `lastIndex` map). `lib/voice/provider.tsx`: `VoiceProvider` (one controller via lazy `useState`, injectable `rng`) + `useVoice(key)` (SSR-safe variant-0 first render → post-hydration mount-effect rotation → `reroll` for interactive controls; throws outside provider). Re-exported from `lib/voice/index.ts`.
- **No SSR/hydration mismatch (AC #2):** randomness never runs during render — variant 0 on server + first paint, rotation in a client mount effect.
- **Fully unit-tested without a DOM harness** (no new deps): the pickable logic is pure; the provider is a thin binding whose render/hydration behaviour is verified by Playwright E2E in Story 3.3 (the render-based "no hydration warning" check moved there, where the provider actually wraps the app). The recurring RTL/component-harness action item stays deferred.
- **FR-17 respected structurally:** the provider is state-agnostic (maps key → rotating variant only); wiring rules in 3.3 keep state/selection text out of it.
- **Scope:** engine only — no surface wired, no CSS uppercasing, no sort-label voicing (all Story 3.3). No component/API/catalog changes; no new dependencies.

### File List

- `lib/voice/rotation.ts` — NEW (nextVariantIndex, createRotationController)
- `lib/voice/provider.tsx` — NEW (VoiceProvider, useVoice)
- `lib/voice/index.ts` — UPDATE (re-export rotation + provider)
- `tests/unit/voice-rotation.test.ts` — NEW (selector + controller unit tests, seeded RNG)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-08 | Story 3.2 drafted (ready-for-dev): pure `nextVariantIndex(count,lastIndex,rng)` + per-key `createRotationController` (no back-to-back, all reachable, deterministic under seeded RNG) + thin `VoiceProvider`/`useVoice` (SSR-safe first render, post-hydration rotation, reroll on activation). Engine only — wiring + hydration E2E in 3.3. No new deps. |
| 2026-07-08 | Story 3.2 implemented (review): `lib/voice/rotation.ts` + `provider.tsx`; 9 unit tests. Two React 19 lint fixes (lazy-useState controller; justified set-state-in-effect for post-hydration rotation). 150 Vitest, 50 E2E. |
| 2026-07-08 | bmad-tea automate: +1 unit (2-variant strict alternation boundary). 151 Vitest. |
| 2026-07-08 | Code review (adversarial 3-layer): Auditor "Faithful". 2 patches — per-surface reroll fix (`pickExcluding`, exclude own index) closing an FR-16 multi-instance bug; doc count. 0 defer (2 notes logged). 5 dismissed. 154 Vitest, 50 E2E. Status → done. |

### Review Findings (2026-07-08, adversarial 3-layer)

Acceptance Auditor: "Faithful." Blind + Edge converged on one real FR-16 bug.

Patch (both applied 2026-07-08):

- [x] [Review][Patch] Per-surface no-back-to-back repeat — FIXED: added `RotationController.pickExcluding(current,count)`; `useVoice.reroll` now excludes THIS surface's own current index (kept shared `pick` for load-time variety). Tests added incl. an explicit repro that a surface never repeats its own label even while another surface churns the shared per-key state. [lib/voice/rotation.ts, lib/voice/provider.tsx, tests/unit/voice-rotation.test.ts]
- [x] [Review][Patch] Doc test count — FIXED: Task 4 now reflects the final count (13 rotation tests). [3-2 story]

Dismissed (5): barrel re-exports the `"use client"` provider (latent only — no Server Component imports the catalog today; noted in deferred-work); StrictMode dev double-rotation (benign, dev-only); `rng` prop captured once (intended/documented); 2-variant test "doesn't exercise rng" (correct — 2 variants have no RNG freedom); key-prop-change one-frame flicker (unreachable — static `VoiceKey` per call site). Provider render/hydration tests deferred to 3.3 (disclosed).
