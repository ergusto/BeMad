# Framework Comparison — BeMad

Why BeMad is a **single, unified Next.js (App Router) application** backed by
containerized PostgreSQL, and what was weighed against it. This records the
technology-choice rationale honestly — trade-offs, not a sales pitch. The
decision is anchored in the architecture spine (AD-1 unified app; AD-3
simplicity).

## The decision

**Next.js 16 (App Router) — UI + API routes in one service — with PostgreSQL via
Drizzle ORM, orchestrated by Docker Compose.**

The app is one deployable unit: React Server/Client Components for the UI and
Route Handlers (`app/api/**`) for the JSON API, sharing one TypeScript codebase,
one Zod schema (`lib/todos`), and one type for the `Todo` shape end-to-end.

## What it optimizes for

- **A single source of truth for the domain type.** The `Todo` Zod schema is
  imported by the API handlers, the repository, and the client — no drift
  between a separate frontend and backend contract.
- **The optimistic-UI model (NFR-1).** React's state model makes optimistic
  update + reconcile + per-operation rollback (AD-7) natural; the ≤100 ms
  "instant" feel is a client-state dispatch.
- **Simplicity of operations (AD-3).** One app service + one Postgres service.
  No CORS, no second deploy target, no shared-types package to publish.
- **The grading requirement, honestly met.** "Dockerfiles for frontend and
  backend" is satisfied by one multi-stage app Dockerfile (frontend + API in one
  Next.js service) plus a Postgres service — still a real multi-container stack
  orchestrated by Compose.

## Alternatives considered

| Option | Why not (for this brief) |
| ------ | ------------------------ |
| **React SPA + separate Node/Express or Fastify API** | Two build/deploy units, CORS to configure, and a shared-types boundary to keep in sync — meaningful extra surface for a solo-user CRUD app. It's the more conventional "frontend and backend" shape, but the added seams buy nothing the unified app lacks here. |
| **Remix** | Excellent nested-data/loader story and progressive enhancement, but for a small optimistic-UI CRUD app it offered no decisive advantage over App Router, and the surrounding tooling/skills assume the Next.js/React mainstream. |
| **SvelteKit** | Lean and fast with a great DX, but the project's conventions, component model, and the accessibility/testing patterns are React-centric; switching stacks would trade familiarity for marginal runtime gains that don't matter at this scale. |
| **Plain Node + server-rendered templates (no SPA framework)** | Simplest server, but it gives up the client-side optimistic-UI model NFR-1 wants; you'd rebuild reactive state management by hand. |
| **Serverless functions + a hosted DB (e.g. Vercel + managed Postgres)** | Fine for production hosting, but the assignment wants a self-contained, `docker compose up` multi-container stack that runs anywhere — a containerized Postgres serves that better than coupling to a specific cloud. |

## Persistence & data layer

- **PostgreSQL** (containerized) for durability + the "real multi-service Docker"
  requirement — over SQLite (weaker as a separate service / concurrency story)
  or a document store (the data is relational and small).
- **Drizzle ORM** for typed, parameterized SQL (also closes the SQL-injection
  surface) and lightweight migrations, over a heavier ORM (Prisma) — Drizzle's
  smaller footprint fits AD-3, and its schema doubles as the type source with
  `drizzle-zod`.

## Honest trade-offs

- A unified app couples the UI and API lifecycles — if the two needed to scale or
  deploy independently, the SPA-plus-API split would win. For a single-user v1
  CRUD app, that independence is speculative complexity (NFR-6 keeps the door
  open without paying for it now).
- App Router + RSC has a learning curve and some sharp edges (server/client
  boundary discipline); the project manages this with explicit `"use client"`
  seams and a single client store (AD-14).

## Bottom line

For a small, delightful, durable single-user todo app that must be fast, testable,
accessible, and runnable with one command, the unified Next.js + Postgres stack
is the simplest thing that fully satisfies the brief — and the architecture
leaves room to split later if the product ever needs it.
