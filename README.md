# BeMad

A small, durable todo application with a **loud personality**: a single unified
Next.js (App Router) app backed by a containerized PostgreSQL database. Every
user-facing string is written in the voice of Mr. Torgue (bleeped), rotating
across ~5 variants per surface — while the engineering, specs, and docs stay
entirely professional. The core is fast (optimistic UI) and dependable (real
persistence, per-operation rollback, WCAG 2.2 AA).

## Prerequisites

- **Node.js 24 LTS** (see `.nvmrc` — run `nvm use`)
- **Docker** and **Docker Compose** (v2+)

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

This is **turnkey** — no manual migration step:

- **db** — PostgreSQL 18, with a named volume (`bemad_pgdata`) for durable data (published on `localhost:${DB_PORT:-5432}`)
- **migrate** — a one-shot service that applies the Drizzle migrations once the db is healthy
- **app** — the Next.js server on http://localhost:3000 (starts only after `migrate` completes)

Then open http://localhost:3000. Verify readiness:

```bash
curl -i http://localhost:3000/api/health
# 200 {"status":"ok"} when the DB is reachable; 503 {"status":"unavailable"} otherwise
```

Stop the stack with `docker compose down` (add `-v` to also remove the data
volume).

### Compose profiles

- **default** (`docker compose up`) — the app stack: `app` + `db` (+ the one-shot `migrate`).
- **`dev`** (`docker compose --profile dev up`) — adds **Adminer** (http://localhost:${ADMINER_PORT:-8080}) for browsing the database.
- **`test`** (`docker compose --profile test up -d db-test`) — an isolated, ephemeral (tmpfs) PostgreSQL on port `${TEST_DB_PORT:-5433}` for the test suites.

## Environment variables

Copy `.env.example` to `.env` and adjust as needed. **Never commit a real `.env`.**
Every variable has a sensible default, so the defaults work out of the box.

| Variable | Default | Purpose |
| -------- | ------- | ------- |
| `APP_PORT` | `3000` | Host port the app is published on |
| `POSTGRES_USER` | `bemad` | Database user (db + db-test) |
| `POSTGRES_PASSWORD` | `bemad` | Database password |
| `POSTGRES_DB` | `bemad` | Application database name |
| `DB_PORT` | `5432` | Host port the `db` service is published on (for migrations / local `npm run dev`) |
| `DATABASE_URL` | derived from `POSTGRES_*` | Connection string the app uses. Leave commented to let compose derive it; set it to point at a different database |
| `POSTGRES_TEST_DB` | `bemad_test` | Test database name (`test` profile) |
| `TEST_DB_PORT` | `5433` | Host port the `db-test` service is published on |
| `TEST_DATABASE_URL` | `postgres://bemad:bemad@127.0.0.1:5433/bemad_test` | Used by integration tests (run from the host) to reach the test DB |
| `ADMINER_PORT` | `8080` | Host port for Adminer (`dev` profile) |

## Local development (without Docker for the app)

```bash
nvm use            # Node 24
npm install
docker compose up -d db                                      # Postgres on localhost:5432
export DATABASE_URL=postgres://bemad:bemad@127.0.0.1:5432/bemad
npm run db:migrate                                           # create the schema (first run only)
npm run dev                                                  # http://localhost:3000
```

## Scripts

| Script                    | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `npm run dev`             | Start the dev server                                 |
| `npm run build`           | Production build (`output: standalone`)              |
| `npm start`               | Start the production server                          |
| `npm run lint`            | ESLint                                               |
| `npm run typecheck`       | TypeScript, no emit                                  |
| `npm test`                | Unit + integration tests (Vitest)                   |
| `npm run test:coverage`   | Vitest with the coverage gate (≥85% logic-layer)    |
| `npm run test:e2e`        | End-to-end tests (Playwright)                        |
| `npm run test:e2e:compose`| E2E against the isolated `test`-profile Postgres     |
| `npm run db:generate`     | Generate a Drizzle migration from schema changes    |
| `npm run db:migrate`      | Apply Drizzle migrations                             |

## Testing

**Vitest** runs the unit + integration suites (156 tests). Integration tests
need a real Postgres via `TEST_DATABASE_URL`; without it they skip (the
`/api/health` "database down" path always runs).

```bash
# Start the isolated test DB and point the tests at it:
docker compose --profile test up -d --wait db-test          # --wait avoids connection-refused flakes
export TEST_DATABASE_URL=postgres://bemad:bemad@127.0.0.1:5433/bemad_test
npm test                # or: npm run test:coverage  (enforces the ≥85% gate)
```

The **coverage gate** (`npm run test:coverage`) measures the logic layer
(`lib/**` + `app/api/**`; the React `.tsx` UI is covered by E2E) and fails below
threshold. See [`docs/qa/test-coverage.md`](docs/qa/test-coverage.md).

**Playwright** runs the end-to-end suite (15 spec files, 84 tests: 41 per project
across Chromium + Pixel 7 mobile, plus a chromium-only performance spec)
covering the core journeys, optimistic UI + rollback, sort, the voice pack, an
**axe accessibility audit**, **XSS-inertness**, and **NFR-1 performance**.
Browsers install on first use (`npx playwright install`).

```bash
npm run test:e2e:compose   # boots the test DB, migrates, runs the full E2E suite
```

**CI** (`.github/workflows/ci.yml`) runs the whole gate on every push/PR:
typecheck, lint, migrate, `test:coverage`, and the Playwright suite against a
real Postgres 18 service.

## Documentation

- **QA reports** — [test coverage](docs/qa/test-coverage.md) · [accessibility audit](docs/qa/accessibility-audit.md) · [security review](docs/qa/security-review.md) · [performance](docs/qa/performance.md)
- **Process & delivery** — [AI-integration log](docs/ai-integration-log.md) · [framework comparison](docs/framework-comparison.md) · [how BMAD guided implementation](docs/bmad-method-summary.md)

## Project structure

```text
app/
  api/health/route.ts          # GET /api/health -> repository healthcheck
  api/todos/route.ts           # GET (list) + POST (create)
  api/todos/[id]/route.ts      # PATCH (update/toggle) + DELETE
  todo-app.tsx                 # the client UI (voiced, accessible)
lib/
  todos/                       # shared Todo type + Zod schema (AD-5)
  db/                          # DB client + TodoRepository (only DB access point)
  store/                       # single client todo store: reducer.ts (pure) + provider
  voice/                       # voice pack: catalog + bleep + rotation + provider (Epic 3)
tests/
  unit/  integration/  e2e/
docs/
  qa/                          # coverage, a11y, security, performance reports
  ai-integration-log.md  framework-comparison.md  bmad-method-summary.md
.github/workflows/ci.yml       # the full verification gate
```

## Tech stack

TypeScript (strict) · Next.js 16 (App Router) + React 19 · Node 24 LTS ·
PostgreSQL 18 · Drizzle ORM · Zod · Vitest (+ v8 coverage) · Playwright +
@axe-core/playwright · Docker Compose. See
[the framework comparison](docs/framework-comparison.md) for why.
