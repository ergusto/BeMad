---
baseline_commit: NO_VCS
---

# Story 1.2: Todo data model, shared Zod schema & repository

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a `todos` table, one shared Zod schema, and a single repository,
so that all persistence is durable, type-safe, and reached through one swappable interface (AD-2/AD-3/AD-5).

## Acceptance Criteria

1. **Given** the running database, **when** migrations are applied, **then** a `todos` table exists with `id` (UUID, server-generated), `text`, `completed` (default `false`), `created_at` (timestamptz). No `updated_at` (by design — FR-7 needs creation time only).
2. **And** a single `TodoRepository` in `lib/db` exposes `create`, `list`, `get`, `update`, `delete`, and `healthcheck`, and is the **only** module importing the DB client (AD-2).
3. **And** one Zod schema + inferred `Todo` type in `lib/todos` is the **sole source of the shape**, imported everywhere as the domain/wire contract, and the **repository is the only place mapping `snake_case`↔`camelCase`** (and DB `Date`↔ISO-8601 string) (AD-5).
4. **And** the shared validation rules are defined once and enforce: `text` trimmed, non-empty/not whitespace-only, **≤ 1000 code points**; update payload is partial (`{ text?, completed? }`) requiring **≥ 1 field** (AD-6/FR-9, and the PATCH contract from AD-4 that Stories 1.4/1.5 consume).
5. **And** the generated migration SQL is committed under `drizzle/` (it is the durable schema source-of-truth; `.gitignore` no longer ignores it).

## Tasks / Subtasks

- [x] **Task 1 — Define the `todos` table (drizzle schema)** (AC: #1, #3)
  - [x] In `lib/db/schema.ts`, replace the placeholder with a `pgTable("todos", …)` using `drizzle-orm/pg-core`: `id: uuid("id").primaryKey().defaultRandom()`, `text: text("text").notNull()`, `completed: boolean("completed").notNull().default(false)`, `createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()`.
  - [x] Use **explicit `snake_case` column-name strings** with `camelCase` TS property names — this (inside `lib/db`) is the sole `snake_case`↔`camelCase` mapping boundary (AD-5). Do NOT add a global `casing` option; keep the mapping explicit and visible.
  - [x] Export the table plus drizzle's inferred `InferSelectModel`/`InferInsertModel` row types for the repository's internal use. **Leave room for a future `owner`** column but do NOT add it (NFR-6).
- [x] **Task 2 — Shared `Todo` type + Zod schemas (single source of shape)** (AC: #3, #4)
  - [x] In `lib/todos` define and export the canonical domain contract, imported by the repository now and by API/client later: `Todo` (domain shape, `camelCase`), `createTodoSchema`, `updateTodoSchema`, and the inferred input types (`CreateTodoInput`, `UpdateTodoInput`).
  - [x] Domain `Todo` = `{ id: string (uuid); text: string; completed: boolean; createdAt: string (ISO-8601 UTC) }`. `createdAt` is a **string** on the wire/domain (conventions: timestamps ISO-8601 UTC); the repository converts the DB `Date` → `toISOString()`.
  - [x] `text` validation: `z.string().trim()` then **non-empty** and **≤ 1000 code points**. ⚠️ `.max(1000)` counts UTF-16 code units, not code points — use a `.refine((s) => [...s].length <= 1000, …)` (or `Array.from(s).length`) so astral characters/emoji are counted as single code points, matching AD-6/FR-9's "1000 code points" wording exactly.
  - [x] `createTodoSchema` = `{ text }`. `updateTodoSchema` = `{ text?, completed? }` with a refinement requiring **at least one** field present (AD-4 partial-update, ≥1 field). These are the validation authority the API handlers will call in Stories 1.3–1.5 (AD-6, server-authoritative).
  - [x] You MAY derive base schemas from the table via `drizzle-zod` (`createInsertSchema`/`createSelectSchema`/`createUpdateSchema` — confirmed exports of `drizzle-zod@0.8.3`) and then refine `text`; if so, keep `lib/todos` the single import point everyone uses. Hand-authoring the domain schema is equally acceptable — the invariant is ONE definition in `lib/todos`, not the mechanism.
- [x] **Task 3 — Implement the repository CRUD** (AC: #2, #3)
  - [x] In `lib/db/repository.ts`, replace the five `notImplemented(...)` stubs with real implementations on `PostgresTodoRepository`, and update the `TodoRepository` interface signatures (they were intentionally-typed `unknown` placeholders in Story 1.1) to the real domain types from `lib/todos`:
    - `create(input: CreateTodoInput): Promise<Todo>` — insert, return the created row (server-generated `id` + `createdAt`) mapped to domain.
    - `list(): Promise<Todo[]>` — return all todos in creation order (`created_at` asc). Ordering/sort is otherwise client-owned (AD-14); the API returns creation-order.
    - `get(id: string): Promise<Todo | null>` — `null` when not found.
    - `update(id: string, patch: UpdateTodoInput): Promise<Todo | null>` — apply the partial, return the updated domain row, `null` when not found.
    - `delete(id: string): Promise<boolean>` — `true` if a row was removed, `false` if none matched (lets Story 1.6 return 404 vs 204).
  - [x] Add a private `toDomain(row)` mapper (DB row → domain `Todo`, `Date` → ISO string). This mapper is the ONLY place rows are reshaped (AD-5). No other layer re-maps.
  - [x] **Preserve** the existing `healthcheck()` (including the `withTimeout` race + late-rejection swallow), `close()`, the `createConnection`/client in `lib/db/client.ts` as the sole DB-driver importer, and `getRepository()`/`createTodoRepository()`/`closeRepository()` in `lib/db/index.ts`. Do not regress them.
- [x] **Task 4 — Generate & commit the migration** (AC: #1, #5)
  - [x] Run `npm run db:generate` (drizzle-kit) to emit the `todos` migration under `drizzle/`. Commit the generated SQL and `drizzle/meta/` (they are now tracked).
  - [x] Verify `npm run db:migrate` applies cleanly against a running Postgres (the compose `db`, or the `test` profile) and produces the table from AC #1.
- [x] **Task 5 — Tests (real Postgres for the DB boundary; unit for the schema)** (AC: #1–#4)
  - [x] **NEW** `tests/integration/repository.test.ts` — CRUD against a real test Postgres (AD-13): `create` returns a server UUID + ISO `createdAt` and `completed:false` by default; `get`/`list` return created rows; `update` changes `text` and/or `completed` and returns the new state (and `null` for a missing id); `delete` removes (returns `true`) and returns `false` for a missing id; **round-trip mapping** correct (snake_case DB ↔ camelCase domain, `Date`→ISO). Gate on `TEST_DATABASE_URL` (skip when unset, like the health integration test).
  - [x] Provide test DB setup: before the suite, run `migrate(db, { migrationsFolder: "./drizzle" })` (from `drizzle-orm/postgres-js/migrator` — confirmed export) against `TEST_DATABASE_URL`, and **truncate `todos` between tests** for isolation (parallel-safe, per test-quality DoD).
  - [x] **NEW** `tests/unit/todo-schema.test.ts` — the shared schema accepts representative valid payloads and rejects: empty/whitespace-only text, text > 1000 **code points** (include an emoji/astral case to prove code-point counting, not UTF-16), and an empty update object (no fields).
  - [x] **UPDATE** `tests/unit/db-repository.test.ts` — **remove** the five `it.each([...]) …("not implemented")` scope-fence assertions (they were Story 1.1's guard and will now fail). Keep the `healthcheck()` true/false and `close()` unit tests (they still hold with the fake db).
  - [x] Full suite green (`npm test` with `TEST_DATABASE_URL` set), typecheck + lint clean, no regressions to the health tests.

## Review Findings

_Code review 2026-07-06 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 5 ACs + invariants (AD-2/3/4/5/6, FR-9, NFR-6, data model) **pass**. Blind + Edge independently converged on the malformed-UUID finding. Triage: 0 decision-needed, 4 patch, 2 deferred, 5 dismissed._

- [x] [Review][Patch] `get`/`update`/`delete` accept `id: string` and pass a non-UUID value to the `uuid` column, throwing a raw Postgres `invalid input syntax for type uuid` instead of the contracted `null`/`false`; tests missed it because "missing" cases use the valid all-zeros UUID [lib/db/repository.ts get/update/delete]
- [x] [Review][Patch] A NUL byte (` `) passes `todoTextSchema` (valid code point, length ≥ 1) but Postgres `text` cannot store it → 500 at insert/update even with API validation [lib/todos/index.ts todoTextSchema]
- [x] [Review][Patch] `list()` orders only by `created_at`; `now()` is transaction-start time and the PK is random, so equal timestamps order arbitrarily (plan-dependent). Add `asc(todos.id)` tiebreaker for query determinism [lib/db/repository.ts list]
- [x] [Review][Patch] Dead export `NewTodoRow` is never used (repository inserts an inline literal) [lib/db/schema.ts]
- [x] [Review][Defer] CRUD integration tests `describe.skip` when `TEST_DATABASE_URL` is unset → a run without the test DB reports green with the data layer unexercised — deferred, systemically caught by Story 4.2's ≥70% coverage gate + CI providing the test DB [tests/integration/repository.test.ts]
- [x] [Review][Defer] `healthcheck()` timeout rejects but does not cancel the in-flight query, so it keeps holding a pooled connection (max 5) during a partial DB outage — deferred, pre-existing Story 1.1 code; postgres.js has no simple query-cancel, revisit if it manifests [lib/db/repository.ts healthcheck]

_Dismissed (with evidence): DB `CHECK` constraint on text (AD-6 locates validation in Zod; simplicity mandate — and the NUL gap is fixed in the schema via patch 2); `gen_random_uuid()` pgcrypto concern (Postgres pinned to 18, built-in since 13); "Zod v4 unstated dependency" (`zod` pinned exactly to 4.4.3); validation message says "characters" not "code points" (the message is not user-facing — the client maps `error.code` to voiced copy per AD-8); no index on `created_at` (premature optimization at this scale)._

**Resolution (2026-07-06):** all 4 patch findings applied and verified. (1) `get`/`update`/`delete` guard the id with a UUID regex → `null`/`null`/`false` for a malformed id, before any query (unit tests prove the DB is not touched). (2) `todoTextSchema` rejects any NUL (U+0000) code point (unit test). (3) `list()` adds `asc(todos.id)` as a deterministic tiebreaker. (4) dead `NewTodoRow` export removed. Post-fix: typecheck + lint clean; **47/47 tests** vs real Postgres 18. The 2 deferred items are recorded in `deferred-work.md`.

## Dev Notes

### What this story turns on (continuation of Story 1.1)

Story 1.1 left precise seams for this story to fill — do not rebuild them, fill them:

- `lib/db/schema.ts` — currently an empty placeholder (`export {}`). Populate with the `todos` table.
- `lib/todos/index.ts` — currently an empty placeholder. Populate with the shared `Todo` type + Zod schemas (or split into `lib/todos/schema.ts` and re-export from `index.ts`).
- `lib/db/repository.ts` — `PostgresTodoRepository` already has real `healthcheck()`/`close()` and a `withTimeout` helper; the five CRUD methods currently `return notImplemented("…")` and the interface uses `unknown` placeholder signatures. Replace both with real, domain-typed implementations.
- `drizzle.config.ts` — already wired (`schema: "./lib/db/schema.ts"`, `out: "./drizzle"`, fails fast if `DATABASE_URL` unset). `db:generate`/`db:migrate` scripts exist.
- `.gitignore` — `/drizzle` is intentionally **not** ignored (fixed in 1.1 review); commit the generated migrations.

### Architecture compliance (guardrails — non-negotiable)

- **AD-2 Single repository:** all reads/writes go through `TodoRepository`; no SQL or DB client outside `lib/db`. `lib/db/client.ts` remains the ONLY module importing `postgres`/`drizzle`.
- **AD-3 Postgres system of record:** durable, server-side only, via the repository.
- **AD-5 Shared shape + single mapper:** exactly one `Todo` type + Zod schema, defined in `lib/todos`, imported everywhere. The **repository is the sole boundary** mapping `snake_case`↔`camelCase` (via the drizzle schema's explicit column names) and `Date`↔ISO string. No other layer re-maps or re-declares the todo shape.
- **AD-6 Server-authoritative validation:** the schema created here IS the validation authority; API handlers (Stories 1.3–1.5) validate against it before hitting the repository. Rules: trim, reject empty/whitespace-only, cap 1000 code points.
- **AD-1 Layering:** `lib/todos` (service/domain) may depend on the repository layer; the repository may import the table type. Neither imports the UI. The UI never imports `lib/db`.
- **AD-4 (partial — schema only here):** the `updateTodoSchema` shape (`{text?, completed?}`, ≥1 field) is defined now; the PATCH route that uses it arrives in Stories 1.4/1.5.
- **Conventions:** DB table `todos`, columns `snake_case`; TS fields `camelCase`; `id` UUID server-generated; timestamps ISO-8601 UTC on the wire; JSON everywhere.
- **NFR-6 forward-compat:** schema leaves room for an `owner` later — do NOT add auth or an owner column now.

### Data model (target)

```text
todos
  id          uuid         PK, server-generated (defaultRandom)
  text        text         NOT NULL   (domain rule: trimmed, 1..1000 code points)
  completed   boolean      NOT NULL DEFAULT false
  created_at  timestamptz  NOT NULL DEFAULT now()
```

Domain shape (what everything above the repository sees):

```ts
type Todo = { id: string; text: string; completed: boolean; createdAt: string /* ISO-8601 UTC */ };
```

### Files this story touches

- **UPDATE (fill placeholder):** `lib/db/schema.ts`, `lib/todos/index.ts` (+ optionally `lib/todos/schema.ts`)
- **UPDATE (implement + retype):** `lib/db/repository.ts` (CRUD + `toDomain`; interface signatures), possibly `lib/db/index.ts` (re-export domain types if convenient)
- **NEW:** `drizzle/0000_*.sql` + `drizzle/meta/*` (generated), `tests/integration/repository.test.ts`, `tests/unit/todo-schema.test.ts`, and optionally a small test setup/helper for migrate+truncate
- **UPDATE (remove stale guard):** `tests/unit/db-repository.test.ts` (drop the "not implemented" scope-fence block)
- **PRESERVE (do not regress):** `lib/db/client.ts`, `lib/db/index.ts` singleton/reset, `app/api/health/route.ts`, `lib/health.ts`, `tests/integration/health.test.ts`, `tests/unit/health*.test.ts`

### Testing standards summary

- **Vitest 4** unit + integration; **real Postgres** for the repository (AD-13), gated on `TEST_DATABASE_URL` (skip when unset). Bring the test DB up with `docker compose --profile test up -d --wait db-test` (the `--wait` matters — see 1.1 review finding #4).
- Apply migrations programmatically in a `beforeAll` via `migrate(db, { migrationsFolder: "./drizzle" })`; truncate `todos` between tests for isolation.
- Coverage floor (≥70%) is enforced later in Story 4.2, but keep meaningful coverage of the CRUD paths and the validation edge cases now.
- Deterministic, isolated, self-cleaning tests (no hard waits, assertions in test bodies).

### Latest tech / API specifics (verified against installed versions)

Pinned in Story 1.1 (already installed): `drizzle-orm@0.45.2`, `drizzle-zod@0.8.3`, `drizzle-kit@0.31.10`, `postgres@3.4.9`, `zod@4.4.3`. Verified API surface:

- `drizzle-orm/pg-core`: `pgTable`, `uuid`, `text`, `boolean`, `timestamp` (use `timestamp("created_at", { withTimezone: true })`).
- `drizzle-zod@0.8.3` exports: `createInsertSchema`, `createSelectSchema`, `createUpdateSchema`, `createSchemaFactory` (Zod 4 compatible).
- `drizzle-orm/postgres-js/migrator`: `migrate(db, { migrationsFolder })` — use for programmatic test migrations.
- **Code-point cap caveat (real footgun):** Zod's `.max(1000)` on a string counts UTF-16 code units; AD-6/FR-9 says "1000 code points". Use `[...text].length` / `Array.from(text).length` in a `.refine` to count code points. Add an emoji test to prove it.

### Project Structure Notes

- Fills the `lib/db` + `lib/todos` seams from the spine's Structural Seed exactly; no new top-level structure.
- `drizzle/` migrations directory is created by `db:generate` and is committed.

### References

- [Source: planning-artifacts/epics.md#Story-1.2] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-2] single repository
- [Source: .../ARCHITECTURE-SPINE.md#AD-3] Postgres system of record
- [Source: .../ARCHITECTURE-SPINE.md#AD-5] shared Todo schema + repository is sole mapper
- [Source: .../ARCHITECTURE-SPINE.md#AD-6] server-authoritative validation (trim/empty/1000 code points)
- [Source: .../ARCHITECTURE-SPINE.md#AD-4] REST/PATCH partial-update shape (schema defined here)
- [Source: .../ARCHITECTURE-SPINE.md#Structural-Seed] ER diagram (id/text/completed/created_at, no updated_at)
- [Source: .../ARCHITECTURE-SPINE.md#Consistency-Conventions] naming, ISO-8601 UTC, UUID id
- [Source: implementation-artifacts/1-1-project-scaffold-containerized-environment.md] established seams: repository/client/index patterns, healthcheck timeout, test-DB `--wait`, `/drizzle` tracked, CRUD stubs to replace
- [Source: _bmad-output/project-context.md] one shared Todo type, repository-only DB access, strict TS, testing rules

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **Zod 4 API** verified against installed `zod@4.4.3`: used `z.uuid()` and `z.iso.datetime()` (Zod 4 moved these off the `z.string()` chain; the `z.string().uuid()`/`.datetime()` forms are deprecated). Confirmed `z.iso.datetime()` accepts `Date.prototype.toISOString()` output.
- **Code-point cap**: `todoTextSchema` uses `[...value].length <= 1000` in a `.refine`, not `.max(1000)` (which counts UTF-16 units). Proven by a unit test: `"👍".repeat(1000)` (2000 UTF-16 units, 1000 code points) is accepted; `1001` is rejected.
- **drizzle-kit** `db:generate`/`db:migrate` read `drizzle.config.ts`, which fails fast without `DATABASE_URL` (1.1 hardening) — supplied a `DATABASE_URL` env for both commands (generate does not connect; migrate does).
- **Migration**: generated `drizzle/0000_clammy_darkstar.sql` — `id uuid PK gen_random_uuid()`, `text not null`, `completed boolean default false not null`, `created_at timestamptz default now() not null`, no `updated_at`. Verified `npm run db:migrate` applies cleanly to a fresh DB and produces exactly that table.
- **noUncheckedIndexedAccess**: `returning()`/`select()` results are indexed defensively (`const row = rows[0]; if (!row) …` / `row ? … : null`).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Story complete and verified.** All 5 ACs, 5 tasks / 23 subtasks satisfied.
- **What was built:** `todos` drizzle table (`lib/db/schema.ts`); the single shared `Todo` type + `createTodoSchema`/`updateTodoSchema`/`todoTextSchema` (`lib/todos`); full `PostgresTodoRepository` CRUD (`create`/`list`/`get`/`update`/`delete`) with a single `toDomain` mapper (snake_case→camelCase, Date→ISO) — AD-5; committed migration under `drizzle/`.
- **Interface retyped:** the `TodoRepository` CRUD signatures moved from Story 1.1's `unknown` placeholders to real domain types; the five `notImplemented()` stubs were replaced with real implementations.
- **Preserved (no regression):** `healthcheck()` + `withTimeout` race, `close()`, `lib/db/client.ts` (sole driver importer), `getRepository()`/`createTodoRepository()`/`closeRepository()`.
- **Verification:** typecheck ✅ · lint ✅ · **33/33 tests** vs real Postgres 18 (7 CRUD integration + 11 schema unit + prior health/db tests); 24 pass / 9 skip without a DB (graceful). `db:migrate` verified on a fresh database.
- **AD-5 boundary:** the domain shape is defined once in `lib/todos`; the drizzle table's explicit `snake_case` column strings + the repository's `toDomain` are the only mapping points. No other layer re-declares or re-maps the todo shape.
- **Scope fences honoured:** no API route handlers (Stories 1.3–1.5), no client store (2.1), no `owner`/auth (NFR-6, left room only). The `updateTodoSchema` shape is defined now for the PATCH routes to consume later.

### File List

**New:**
- `drizzle/0000_clammy_darkstar.sql` — generated `todos` migration
- `drizzle/meta/_journal.json`, `drizzle/meta/0000_snapshot.json` — drizzle migration metadata
- `tests/integration/repository.test.ts` — real-Postgres CRUD (migrate + truncate per test)
- `tests/unit/todo-schema.test.ts` — shared-schema validation (incl. code-point/emoji cases)

**Modified:**
- `lib/db/schema.ts` — `todos` table (was placeholder)
- `lib/todos/index.ts` — shared `Todo` type + Zod schemas (was placeholder)
- `lib/db/repository.ts` — CRUD implementations + `toDomain`; `TodoRepository` interface retyped
- `tests/unit/db-repository.test.ts` — removed the Story 1.1 "not implemented" scope-fence block
- `tests/unit/health.test.ts` — stub repo updated to satisfy the retyped interface

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-03 | Story 1.2 drafted (ready-for-dev): todos table, shared Zod schema + Todo type, repository CRUD + mapping, migration, real-Postgres integration + schema unit tests. |
| 2026-07-06 | Story 1.2 implemented: `todos` drizzle table + committed migration; single shared `Todo` type + create/update Zod schemas (code-point-accurate cap) in `lib/todos`; full `PostgresTodoRepository` CRUD with sole `toDomain` mapper (AD-5); interface retyped from 1.1 placeholders. Health/client/singleton preserved. 33/33 tests vs real Postgres 18, typecheck + lint clean, `db:migrate` verified. Status → review. |
| 2026-07-06 | Test-automation expansion (bmad-tea → automate): +9 guardrail tests (todoSchema conformance, empty-patch branch, id/createdAt preservation, empty-list, update trim, domain-schema guards). 42/42; coverage 97.1% stmts / 95.83% branch. |
| 2026-07-06 | Code review (Blind + Edge + Auditor): ACs/invariants pass; Blind+Edge converged on malformed-UUID. 4 patches applied (UUID guard → null/false; reject NUL in text; list() id tiebreaker; remove dead NewTodoRow), 2 deferred (skip-without-DB, healthcheck query-cancel), 5 dismissed. Post-fix 47/47 tests green. Status → done. |
