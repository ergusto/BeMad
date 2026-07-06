# PRD Addendum — BeMad

Depth and technical-how kept out of the capability-focused PRD.

## Technical direction (settled in project-context.md; confirmed/expanded in architecture)
- TypeScript (strict), Next.js (App Router), Next.js Route Handlers as the API, Vitest + Playwright.
- **Persistence mechanism is intentionally undecided** — chosen in `bmad-architecture`. Must satisfy FR-21 (durable, server-side, survives refresh/session; genuinely durable in the chosen Next.js runtime, not serverless-ephemeral). Route all data access through a single data-access module so the store is swappable.
- Optimistic-UI + rollback (FR-10); rotation selector must be deterministic-testable (inject seed, no `Math.random()` in components).

## Voice & copy
- The authoritative Voice & Copy Guide — ~5 rotating Torgue variants per surface, the clarity rule, and the accessibility rule — lives in the **product brief addendum** (`briefs/brief-BeMad-2026-07-02/addendum.md`, §2). Not duplicated here; FR-14–FR-20 reference it.

## Forward-compatibility
- Data model should leave room for an `owner` concept to enable future auth/multi-user (NFR-6 constraint), without building it in v1.
