---
baseline_commit: NO_VCS
---

# Story 1.1: Project scaffold & containerized environment

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want a scaffolded Next.js project that runs with its database via Docker Compose,
so that every later story builds and runs in a consistent, reproducible environment from day one.

## Acceptance Criteria

1. **Given** a clean checkout, **when** I follow the README and run `docker compose up`, **then** the Next.js 16 (App Router, TypeScript strict) app starts alongside a PostgreSQL 18 container, and `GET /api/health` returns **200 only when the DB is reachable** (and **503** when it is not).
2. **And** the source tree matches the spine seed: `app/` (with `api/health/route.ts`), `lib/{todos,db,voice,store}`, `tests/{unit,integration,e2e}`.
3. **And** `package.json` scripts exist for `dev`, `build`, `test` (Vitest), and `test:e2e` (Playwright), with **Node 24** pinned (via `engines` and `.nvmrc`/Dockerfile base image).
4. **And** a **multi-stage Dockerfile** runs the app as a **non-root** user and defines a `HEALTHCHECK`; `docker-compose.yml` defines a **named volume** and **`dev`/`test` profiles**, with per-service health checks and config via `.env`.
5. **And** `GET /api/health` verifies DB connectivity **through `TodoRepository.healthcheck()`** in `lib/db` — never a second/direct DB path (AD-2, AD-12).
6. **And** all dependency versions in `package.json` and the Dockerfile base images are **pinned to exact versions** (no `^`/`~`), matching the Stack table below.

## Tasks / Subtasks

- [x] **Task 1 — Scaffold the Next.js 16 App Router project (TS strict)** (AC: #2, #3, #6)
  - [x] Initialize a Next.js 16 App Router app in TypeScript at the repo root (do **not** create a nested `bemad/` subfolder — the repo root *is* the app root; the spine's `bemad/` in the seed denotes the project root, not a subdirectory).
  - [x] Enable `"strict": true` in `tsconfig.json`; also enable `noUncheckedIndexedAccess`. Configure path aliases (e.g. `@/lib/*`, `@/app/*`) — no deep `../../..` relative chains (project-context).
  - [x] Set up ESLint + Prettier. Do **not** yet add the "no literal user-facing strings in JSX" lint guard — that belongs to Epic 3 (Story 3.3); adding it now would flag placeholder scaffold copy.
  - [x] Add `engines.node` = "24.x" in `package.json` and an `.nvmrc` pinning Node 24.
  - [x] Add scripts: `dev` (next dev), `build` (next build), `start` (next start), `test` (vitest run), `test:e2e` (playwright test). Lint script optional.
- [x] **Task 2 — Create the directory seed** (AC: #2)
  - [x] Create `lib/todos/`, `lib/db/`, `lib/voice/`, `lib/store/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`.
  - [x] Add a short `.gitkeep` or a one-line placeholder module in each otherwise-empty `lib/*` dir so the structure is committed. Do **not** implement domain/voice/store logic here — those are later stories (1.2, 2.1, 3.x). Placeholders only, with a comment noting the owning story.
- [x] **Task 3 — Minimal repository + DB client in `lib/db`** (AC: #1, #5)
  - [x] Add the DB client (Drizzle + `pg`/`postgres` driver) wired to `DATABASE_URL` from env. This is the **only** module that imports the DB client (AD-2).
  - [x] Define the `TodoRepository` **interface** and a concrete implementation exposing **`healthcheck(): Promise<boolean>`** now (runs a trivial `SELECT 1`). Declare the CRUD method signatures (`create`/`list`/`get`/`update`/`delete`) but leave them as `throw new Error('not implemented — Story 1.2')` stubs — the `todos` table, shared Zod schema, and CRUD bodies are **Story 1.2's scope**, not this story's.
  - [x] Export a single repository instance/factory for consumption by route handlers only (never by client/UI — AD-1).
- [x] **Task 4 — `GET /api/health` route handler** (AC: #1, #5)
  - [x] Create `app/api/health/route.ts`: call `repo.healthcheck()`; return `200 { status: 'ok' }` on success, `503 { status: 'unavailable' }` on failure. Plain (un-voiced) JSON — this is an ops endpoint, not user-facing copy (AD-8 voice-scope boundary).
  - [x] Handle the DB-down case without throwing an unhandled rejection (wrap in try/catch at the handler boundary — project-context error-boundary rule).
- [x] **Task 5 — Multi-stage Dockerfile** (AC: #1, #4, #6)
  - [x] Multi-stage build (deps → build → runtime) on a pinned `node:24-*` base image. Use Next.js `output: 'standalone'` for a lean runtime image.
  - [x] Run as a **non-root** user in the final stage.
  - [x] Add a `HEALTHCHECK` that curls/wgets `GET /api/health`.
- [x] **Task 6 — `docker-compose.yml` + `.env.example`** (AC: #1, #4)
  - [x] Define `app` and `db` (postgres:18-*, pinned) services. `app` depends on `db` being healthy (`depends_on` with `condition: service_healthy`).
  - [x] `db`: named volume for `/var/lib/postgresql/data`; a Postgres `healthcheck` (`pg_isready`).
  - [x] Config via `.env` (compose `env_file`); provide `.env.example` documenting `DATABASE_URL`, `POSTGRES_USER/PASSWORD/DB`, and the app port. Do **not** commit real secrets.
  - [x] Define compose **profiles** `dev` and `test` (test profile targets the test Postgres used by integration tests in later stories).
- [x] **Task 7 — Test infrastructure** (AC: #1, #3)
  - [x] Install & configure **Vitest 4** (`vitest.config.ts`), **Playwright + @axe-core/playwright** (`playwright.config.ts`).
  - [x] Integration test: `GET /api/health` returns **503 when DB is down** and **200 when up** (may run against the compose `test` profile / a real test Postgres — AD-13 prefers real Postgres over mocks for the DB boundary).
  - [x] Smoke check (documented, and scripted if feasible): `docker compose up` boots both services and the container `HEALTHCHECK` passes.
- [x] **Task 8 — README (scaffold section)** (AC: #1)
  - [x] Document prerequisites (Node 24, Docker), `docker compose up`, env setup from `.env.example`, and the test commands (`test`, `test:e2e`). Plain/professional prose — never Torgue (voice-scope boundary). Full delivery docs are Story 4.4; this is the minimal "how to run it" section.

## Review Findings

_Code review 2026-07-03 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 6 ACs and checked invariants (AD-1/2/8/11/12, exact-pinning, Node 24) **pass**; deferrals are in-spec. Triage: 0 decision-needed, 7 patch, 0 deferred, 4 dismissed as false positives._

- [x] [Review][Patch] Health endpoint returns 500 instead of the documented 503 when `getRepository()` throws (e.g. `DATABASE_URL` unset): `GET` calls `getRepository()` before `healthResponse`, so the throw escapes as an unhandled 500 + stack trace [app/api/health/route.ts:9]
- [x] [Review][Patch] `healthcheck()` has no statement/query timeout — `connect_timeout` bounds connection only; a DB that connects but never answers `select 1` hangs the probe indefinitely [lib/db/client.ts:17, lib/db/repository.ts (healthcheck)]
- [x] [Review][Patch] Compose `DATABASE_URL` default hardcodes `bemad:bemad@…/bemad`, decoupled from `POSTGRES_*`; setting `POSTGRES_PASSWORD` (or user/db) in `.env` without also setting `DATABASE_URL` → permanent auth failure / 503 with no config error [docker-compose.yml]
- [x] [Review][Patch] Documented test flow doesn't wait for `db-test` readiness — `up -d` returns before Postgres accepts connections, so the reachable-DB suite can flakily see connection-refused → 503/false [README.md, docker-compose.yml, tests/integration/health.test.ts]
- [x] [Review][Patch] `.gitignore` ignores `/drizzle`, which would silently untrack the migrations Story 1.2 generates (`drizzle.config.ts out: "./drizzle"`) — migrations are the durable schema source-of-truth and must be committed [.gitignore]
- [x] [Review][Patch] `getRepository()` singleton is module-scoped with no `globalThis` HMR guard and is never reset after `close()` — pools (`max: 5` each) can accumulate on dev reload / stay dead after close [lib/db/index.ts]
- [x] [Review][Patch] `drizzle.config.ts` falls back to an empty-string `DATABASE_URL` instead of failing fast, yielding an opaque driver error on misconfig [drizzle.config.ts]

_Dismissed as false positives (refuted with evidence): vitest `@/*` alias "won't resolve" (suite runs 20/20; `resolve.tsconfigPaths` is valid in Vitest 4); "missing package-lock.json" (exists — Docker `npm ci` succeeded); "public/ missing breaks Docker COPY" (`public/.gitkeep` present, build succeeded); "eslint config not iterable" (default export is an array; lint clean). Acknowledged-minor: `app`/`adminer` lack an explicit compose `healthcheck`, but `app` is covered by the Dockerfile `HEALTHCHECK` (Compose honors it) and `adminer` is optional dev tooling._

**Resolution (2026-07-03):** all 7 patch findings applied and verified. (1) `GET /api/health` now wraps in try/catch → 503 on any construction/misconfig error (regression test added). (2) `healthcheck()` races the query against a 4s timeout (below Docker's 5s probe). (3) compose `DATABASE_URL` default derived from `POSTGRES_*` — verified end-to-end (custom password, `DATABASE_URL` unset → app connected, health 200). (4) README test flow uses `docker compose --profile test up -d --wait db-test`. (5) `/drizzle` no longer git-ignored. (6) singleton cached on `globalThis` + `closeRepository()` reset. (7) `drizzle.config.ts` fails fast when `DATABASE_URL` unset. Post-fix: typecheck + lint clean; **21/21 tests pass** against real Postgres 18; full stack boots healthy.

## Dev Notes

### Scope discipline (read first)

This is the **foundation story**. Build the skeleton the whole app hangs on — **do not** implement features that belong to later stories:

- **Story 1.2** owns the `todos` table, migrations, the shared Zod schema + `Todo` type, and the real CRUD repository bodies. Here you only need the DB client, the `TodoRepository` interface, and a working `healthcheck()`.
- **Story 2.1** owns the client todo store in `lib/store/`. Here it is an empty placeholder dir.
- **Epic 3** owns `lib/voice/` (voice pack, rotation selector, provider) and the JSX-literal-strings lint guard. Here `lib/voice/` is an empty placeholder dir.
- Keep it minimal — project-context mandates **bias to simplicity, no premature abstraction**.

### Environment reality — git is ALREADY initialized

The repo is **already a git repository** (`.git` exists; branch `main`, **zero commits yet**; `_bmad`, `_bmad-output`, `docs` are currently untracked). This **contradicts** `project-context.md` which says "Repo is not yet initialized with git — initialize it." **Do NOT run `git init`.** Just add a `.gitignore` (node_modules, `.next`, `.env`, coverage, Playwright artifacts) and commit the scaffold. Conventional Commits suggested; commit messages stay plain/professional — never Torgue.

### Architecture compliance (guardrails — non-negotiable)

- **AD-1 Layered dependency direction:** UI → API → service → repository → Postgres, never backward. The UI never imports `lib/db`. Only `lib/db` imports the DB client. The health route (API layer) may call the repository — that's allowed.
- **AD-2 Single repository:** all DB access behind one `TodoRepository` in `lib/db`; `healthcheck()` lives here so `/api/health` respects the boundary. No `SELECT 1` anywhere but inside the repository.
- **AD-3 Postgres is the system of record:** durable, containerized, server-side only.
- **AD-8 Voice-scope boundary:** `/api/health` output, logs, env var names, and identifiers stay **plain** — the Torgue voice is user-facing copy only, and there is no user-facing copy in this story.
- **AD-12 Docker Compose deployment:** multi-stage Dockerfile (non-root + `HEALTHCHECK`), `app` + `db`, named volume, per-service health checks, `.env` + `dev`/`test` profiles, `docker compose up` runs the whole system.
- **AD-13 Test floor:** the DB boundary is tested against a **real** Postgres, not a mock. This story establishes the harness; coverage/E2E-count gates are enforced in Epic 4.
- **Naming (conventions table):** files `kebab-case`; React components `PascalCase`; vars/functions `camelCase`; DB table `todos` + `snake_case` columns (relevant in 1.2); TS fields `camelCase`.
- **Config:** via env vars only. Server logs are structured and plain.
- **Forward-compat (NFR-6):** no auth in v1, but do nothing that precludes adding an `owner` later.

### File structure (target seed — repo root)

```text
./                         # repo root = app root (NOT a nested bemad/ folder)
  app/
    page.tsx               # minimal placeholder UI for now (real todo UI is Epic 1/2)
    api/
      health/route.ts      # GET /api/health -> repo.healthcheck()  (THIS STORY)
      # todos/route.ts and todos/[id]/route.ts come in Stories 1.3-1.6
  lib/
    todos/                 # placeholder (Story 1.2: Todo type + Zod schema + service)
    db/                    # DB client + TodoRepository interface + healthcheck() (THIS STORY); CRUD bodies in 1.2
    voice/                 # placeholder (Epic 3)
    store/                 # placeholder (Story 2.1)
  tests/
    unit/  integration/  e2e/
  Dockerfile               # multi-stage, non-root, HEALTHCHECK
  docker-compose.yml       # app + db (postgres), named volume, profiles dev/test
  .env.example
  .nvmrc                   # 24
  vitest.config.ts
  playwright.config.ts
```

Every file listed under "THIS STORY" is **NEW** — this is greenfield, so there are no existing files to preserve or regress.

### Client-state library decision (AD-14 — deferred, note only)

AD-14 fixes that there is exactly **one** client-side owner of todo collection state; the specific tool (hand-rolled provider / SWR / React Query) is a scaffold choice, but the **store itself is built in Story 2.1**, not here. You do not need to pick or install it in this story. If you install nothing, leave `lib/store/` as a placeholder. (Recommendation for later, given the "bias to simplicity" mandate: a small hand-rolled provider or SWR over React Query — but that is Story 2.1's call.)

### Testing standards summary

- **Vitest 4** for unit/integration; **Playwright + @axe-core/playwright** for E2E. Node 24.
- This story's required test: integration on `/api/health` (503 down / 200 up). Prefer exercising the real handler against a real (test-profile) Postgres per AD-13 rather than mocking the DB.
- Keep the rotation-selector "inject the RNG, never call `Math.random()` in components" rule in mind for later — not exercised here.

### Latest tech information (pin exact at scaffold)

The architecture already ran a web-backed version reality-check (Node→24 LTS, Postgres→18 confirmed). **Pin exact versions** — verify the current stable patch for each with `npm view <pkg> version` (and Docker tags for `node`/`postgres`) at scaffold time, then hard-pin. Targets:

| Name | Target | Notes |
| --- | --- | --- |
| TypeScript | latest stable | `strict: true`, `noUncheckedIndexedAccess` |
| Next.js (App Router) + React | 16.x | App Router, `output: 'standalone'` for Docker |
| Node.js | 24 LTS | `engines`, `.nvmrc`, Docker base image |
| PostgreSQL | 18.x | pinned compose image |
| Drizzle ORM | 0.4x | **pin exact** (pre-1.0); behind the repository |
| Zod + drizzle-zod | 4.x | shared schema — used in 1.2, install-ready here |
| Vitest | 4.x | |
| Playwright + @axe-core/playwright | latest stable | |
| Docker + Docker Compose | current | |

### Project Structure Notes

- Aligns with the spine's Structural Seed. The single interpretation decision: the seed's top-level `bemad/` is the **project root**, so scaffold at the repo root, not in a nested subfolder.
- No conflicts detected with existing files (greenfield app; only `_bmad*`/`docs` planning artifacts exist).

### References

- [Source: planning-artifacts/architecture/architecture-BeMad-2026-07-02/ARCHITECTURE-SPINE.md#AD-1] layered dependency direction
- [Source: .../ARCHITECTURE-SPINE.md#AD-2] single TodoRepository + `healthcheck()`
- [Source: .../ARCHITECTURE-SPINE.md#AD-3] Postgres system of record
- [Source: .../ARCHITECTURE-SPINE.md#AD-12] Docker Compose deployment (non-root, HEALTHCHECK, profiles, named volume)
- [Source: .../ARCHITECTURE-SPINE.md#AD-13] test strategy floor (Vitest/Playwright/axe, real test Postgres)
- [Source: .../ARCHITECTURE-SPINE.md#Structural-Seed] directory seed
- [Source: .../ARCHITECTURE-SPINE.md#Stack] pinned version targets
- [Source: .../ARCHITECTURE.md#6-deployment-ad-12] deployment prose
- [Source: planning-artifacts/epics.md#Story-1.1] acceptance criteria + tests, and "Additional Requirements / Scaffold (Epic 1 / Story 1)"
- [Source: planning-artifacts/prds/prd-BeMad-2026-07-02/prd.md] FR/NFR set
- [Source: _bmad-output/project-context.md] tech stack, strict-TS, voice-scope, testing, workflow rules (note: git-init statement is stale — repo already initialized)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **Exact versions pinned** by querying the npm registry at implementation time (`npm view <pkg> version`). Node runtime pinned to 24 via `engines` + `.nvmrc` + `node:24-alpine` base image; app runtime dependencies and dev tooling pinned with no `^`/`~`.
- **ESLint version correction:** the initially-pinned `eslint@10.6.0` broke `eslint-config-next@16` twice — first the FlatCompat wrapper threw a circular-JSON error, then (after switching to the native flat-config export) the bundled `eslint-plugin-react` failed on ESLint 10's removal of `context.getFilename()`. Resolved by pinning `eslint@9.39.4` (eslint-config-next's supported line, peer `>=9`) and consuming its native flat config directly (`import next from "eslint-config-next"`), which also let me drop the `@eslint/eslintrc` dependency.
- **Vitest path alias:** dropped `vite-tsconfig-paths` in favour of Vitest 4's native `resolve.tsconfigPaths: true` (simplicity — one fewer dependency).
- **Postgres 18 data-dir gotcha (real, would have broken `docker compose up`):** the `postgres:18-alpine` image refuses to start when the volume is mounted at `/var/lib/postgresql/data` (it now uses a version-specific subdirectory and treats the old path as an "unused mount"). Fixed by mounting the named volume (and the test-profile tmpfs) at `/var/lib/postgresql`. Verified the fixed stack boots healthy.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Scaffold complete and verified end-to-end.** All 8 tasks / 6 ACs satisfied.
- **Verification evidence:**
  - `npm run typecheck` → clean; `npm run lint` → clean; `npm run build` → success, `.next/standalone/server.js` produced, `/api/health` reported as dynamic (`ƒ`).
  - `npm test` → integration test green. DB-down path (2 tests) runs with no database; DB-up path (2 tests) verified against a real PostgreSQL 18 container and against the `test`-profile `db-test` — 4/4 passing.
  - `docker compose up --build` → both `db` and `app` become healthy; container runs as **non-root** `nextjs` (uid 1001, gid 1001 nodejs).
  - **Live health behaviour confirmed in the running container:** `GET /api/health` → `200 {"status":"ok"}` with DB up; stopping `db` → `503 {"status":"unavailable"}`; restarting `db` → back to `200`. This proves AC #1 ("200 only when DB reachable") and AC #5 (checked via `TodoRepository.healthcheck()`).
- **Scope fences honoured:** `todos` table / shared Zod schema / CRUD bodies deferred to Story 1.2 (repository CRUD methods reject as not-implemented; `lib/db/schema.ts` empty); `lib/store` (2.1) and `lib/voice` (Epic 3) are placeholders; the JSX-string lint guard is left for Story 3.3.
- **Interpretation note (compose profiles):** bare `docker compose up` runs the dev stack (`app` + `db`, named volume) to satisfy AC #1's literal command. The `test` profile adds an isolated ephemeral `db-test` (tmpfs, port 5433); the `dev` profile adds Adminer as a concrete, DB-inspection dev tool so both named profiles are meaningful.
- **Environment note:** git was already initialized (empty `main`, no commits) — did NOT re-init; added `.gitignore`. `baseline_commit` recorded as `NO_VCS` (no HEAD existed).
- Next telemetry left default-off via `NEXT_TELEMETRY_DISABLED=1` in the Docker build/runtime stages.

### File List

**New files:**

- `package.json` — scripts (dev/build/start/lint/typecheck/test/test:e2e/db:*), Node 24 `engines`, exact-pinned deps
- `package-lock.json` — lockfile (required by Dockerfile `npm ci`)
- `.nvmrc` — Node 24
- `tsconfig.json` — TS strict + `noUncheckedIndexedAccess` + `@/*` alias (Next augmented `jsx`/`include` on first build)
- `next.config.ts` — `output: "standalone"`
- `eslint.config.mjs` — native flat config from `eslint-config-next`
- `.prettierrc.json`
- `.gitignore`, `.dockerignore`
- `drizzle.config.ts` — migration tooling config (schema populated in 1.2)
- `app/layout.tsx`, `app/page.tsx`, `app/globals.css` — minimal placeholder UI
- `app/api/health/route.ts` — `GET /api/health` (Node runtime, dynamic)
- `lib/health.ts` — `healthResponse(repo)` → 200/503
- `lib/db/client.ts` — Drizzle + postgres.js connection (the only DB-driver importer)
- `lib/db/repository.ts` — `TodoRepository` interface + `PostgresTodoRepository` (`healthcheck()` real; CRUD stubbed for 1.2)
- `lib/db/index.ts` — `createTodoRepository(url)` + lazy `getRepository()`
- `lib/db/schema.ts` — placeholder (1.2)
- `lib/todos/index.ts`, `lib/voice/index.ts`, `lib/store/index.ts` — placeholders
- `vitest.config.ts`, `playwright.config.ts`
- `tests/integration/health.test.ts` — 503-down / 200-up
- `tests/unit/.gitkeep`, `tests/e2e/smoke.spec.ts` (skipped placeholder), `public/.gitkeep`
- `Dockerfile` — multi-stage, non-root, `HEALTHCHECK`
- `docker-compose.yml` — `app` + `db` (named volume), `test` (`db-test`) and `dev` (Adminer) profiles
- `.env.example`
- `README.md` — scaffold/run/test documentation

## Change Log

| Date       | Change                                                                 |
| ---------- | --------------------------------------------------------------------- |
| 2026-07-03 | Story 1.1 implemented: Next.js 16 + TS-strict scaffold, `lib/db` repository with real `healthcheck()`, `GET /api/health`, multi-stage non-root Dockerfile, Docker Compose (app + Postgres 18, named volume, dev/test profiles), Vitest/Playwright infra + health integration test, README. Verified via typecheck/lint/build/test and a live `docker compose up` (health 200↔503 across DB up/down). Status → review. |
| 2026-07-03 | Code review (Blind Hunter + Edge Case Hunter + Acceptance Auditor): ACs/invariants pass; 7 patch findings applied (503-on-misconfig, healthcheck timeout, compose credential coupling, `--wait` test flow, un-ignore `/drizzle`, globalThis singleton + `closeRepository()`, drizzle-config fail-fast), 4 dismissed as false positives. Post-fix 21/21 tests green + live stack verified. Status → done. |
