# Test Coverage Report — BeMad

**Story:** 4.2 (Coverage & accessibility audit) · **Target:** AD-13 — ≥70% *meaningful* coverage, reported.
**Result:** ✅ Logic-layer coverage **~95%**, gated at a **≥85%** floor (branches ≥80%) in the Vitest config; enforced in CI.

## What is covered where

BeMad is tested at two layers, and coverage is measured where each layer is responsible:

| Layer | Tool | Environment | What it covers | Coverage measured? |
| ----- | ---- | ----------- | -------------- | ------------------ |
| Logic (`.ts`) | **Vitest** (unit + integration) | node | `lib/**` (repository, http, health, todos-client, Zod schemas, **the store reducer/state-machine in `lib/store/reducer.ts`**, sort, rotation, voice catalog/bleep) + `app/api/**` route handlers | **Yes — the % below** |
| UI (`.tsx`) | **Playwright** E2E | real browser | `app/todo-app.tsx`, the React providers (`lib/store/todo-store.tsx`, `lib/voice/provider.tsx`), every user journey | Covered by 78 E2E tests (not in the Vitest %) |

**Why the split:** Vitest runs in a node environment and does not render React, so a `.tsx` component shows ~0% under Vitest even though it is thoroughly exercised by the browser E2E suite. Counting `.tsx` in the Vitest number would *understate* reality and gate on a false signal. The Vitest gate is therefore scoped to the `.ts` logic layer (`coverage.include = ["lib/**", "app/api/**"]`, `coverage.exclude = ["**/*.tsx"]`). Vitest 4's v8 provider includes all files matching `include` by default (even un-imported ones), so a new, untested `.ts` logic file drags the number down and the gate catches it. The two reports together are the "meaningful coverage." Merging Playwright + Vitest into one instrumented number was rejected as over-engineering (AD-3).

> **Note (why the reducer is a `.ts` module):** the optimistic-mutation state machine — the most important pure client logic — was originally inside the `"use client"` provider (`todo-store.tsx`) and would have been dropped by the `**/*.tsx` exclusion despite being unit-tested. Story 4.2 extracted it to `lib/store/reducer.ts` so it is genuinely counted by the gate (pure logic node-tested; only the React provider stays `.tsx`/E2E-covered). No behaviour change.

## Vitest coverage (measured)

Command: `npm run test:coverage` (v8 provider). 156 tests across 15 files.

| Metric | Coverage | Gate (fails below) |
| ------ | -------- | ------------------ |
| Statements | 94.89% (223/235) | 85% |
| Branches | 94.44% (102/108) | 80% |
| Functions | 98.41% (62/63) | 85% |
| Lines | 94.73% (216/228) | 85% |

The AD-13 floor is 70%; the gate is set well above it with headroom below the ~95% actual, so it catches a real regression without flaking on a one-line change. The HTML report is written to `./coverage`.

Lowest per-file (still well above the floor): the API route handlers `app/api/todos/route.ts` (79% stmts) and `app/api/todos/[id]/route.ts` (84%) — the uncovered lines are defensive `catch`/500 branches. All other logic files (repository, todos-client, reducer, sort, rotation, schemas, voice) are ≥95%.

## Playwright E2E (the UI layer) — 39 tests × 2 projects (chromium + Pixel 7 mobile) = 78

| Spec | Tests | Journey |
| ---- | ----: | ------- |
| optimistic | 6 | optimistic add/toggle/edit/delete + rollback |
| sort | 5 | all four sort orders + pending placement |
| voice | 5 | voiced copy, rotation, caps-via-CSS, voiced errors |
| a11y | 7 | axe scans + keyboard + focus-return + stable names |
| responsive | 4 | layout across viewports |
| states | 3 | empty / loading / load-error |
| persistence | 2 | durability across a brand-new session |
| edit-cancel | 2 | cancel edit restores text |
| create-view, delete-with-confirm, edit-in-place, toggle-complete, validation | 1 each | core CRUD + validation |

## Notes / enforcement

- **Integration tests require `TEST_DATABASE_URL`** — without it they skip, which visibly drops `lib/db` coverage and can breach the gate. CI (Story 4.1) sets `TEST_DATABASE_URL` against a real Postgres 18 service, so integration always runs there and the gate is meaningful (soft-enforces the Epic 1 "integration skips silently" concern).
- The coverage config only computes/enforces when run with `--coverage`; a plain `npm test` is unaffected.
- Deferred (not blocking AD-13): a React Testing Library component harness would let some `.tsx` failure-paths be unit-tested and folded into the Vitest number. Tracked in `deferred-work.md`.

## How to run locally

```bash
docker compose --profile test up -d --wait db-test
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npm run db:migrate
TEST_DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test \
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npm run test:coverage
```
