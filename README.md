# BeMad

A small, durable todo application: a single unified Next.js (App Router)
application backed by a containerized PostgreSQL database. This README covers
setup and running the app; full delivery documentation is completed in a later
story.

## Prerequisites

- **Node.js 24 LTS** (see `.nvmrc` — run `nvm use`)
- **Docker** and **Docker Compose** (v2+)

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

This starts two services:

- **app** — the Next.js server on http://localhost:3000
- **db** — PostgreSQL 18, with a named volume (`bemad_pgdata`) for durable data

The app waits for the database to be healthy before starting. Verify readiness:

```bash
curl -i http://localhost:3000/api/health
# 200 {"status":"ok"} when the DB is reachable; 503 {"status":"unavailable"} otherwise
```

Stop the stack with `docker compose down` (add `-v` to also remove the data
volume).

### Compose profiles

- **default** (`docker compose up`) — the dev stack: `app` + `db`.
- **`dev`** (`docker compose --profile dev up`) — adds **Adminer**
  (http://localhost:8080) for browsing the database.
- **`test`** (`docker compose --profile test up -d db-test`) — an isolated,
  ephemeral (tmpfs) PostgreSQL on port `5433` for the test suites.

## Local development (without Docker for the app)

```bash
nvm use            # Node 24
npm install
# Start a database (e.g. the compose db service):
docker compose up -d db
export DATABASE_URL=postgres://bemad:bemad@127.0.0.1:5432/bemad
npm run dev        # http://localhost:3000
```

## Scripts

| Script             | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `npm run dev`      | Start the dev server                               |
| `npm run build`    | Production build (`output: standalone`)            |
| `npm start`        | Start the production server                         |
| `npm run lint`     | ESLint                                              |
| `npm run typecheck`| TypeScript, no emit                                |
| `npm test`         | Unit + integration tests (Vitest)                  |
| `npm run test:e2e` | End-to-end tests (Playwright)                       |

## Testing

Unit and integration tests run with **Vitest**:

```bash
npm test
```

The `/api/health` integration test always verifies the "database down" path.
To also exercise the "database up" path against a real Postgres (per the
project's test strategy), start the test database and point the tests at it:

```bash
# --wait blocks until db-test reports healthy, avoiding connection-refused flakes
docker compose --profile test up -d --wait db-test
export TEST_DATABASE_URL=postgres://bemad:bemad@127.0.0.1:5433/bemad_test
npm test
```

End-to-end tests run with **Playwright** (browsers install on first use via
`npx playwright install`). The full E2E suite is built out in later stories.

## Project structure

```text
app/                     # UI + API (Next.js App Router)
  api/health/route.ts    # GET /api/health -> repository healthcheck
lib/
  todos/                 # shared Todo type + Zod schema + service (Story 1.2)
  db/                    # DB client + TodoRepository (only DB access point)
  voice/                 # voice pack + rotation (Epic 3)
  store/                 # single client-side todo store (Story 2.1)
tests/
  unit/  integration/  e2e/
```

## Tech stack

TypeScript (strict) · Next.js 16 (App Router) + React · Node 24 LTS ·
PostgreSQL 18 · Drizzle ORM · Zod · Vitest · Playwright + @axe-core/playwright ·
Docker Compose.
