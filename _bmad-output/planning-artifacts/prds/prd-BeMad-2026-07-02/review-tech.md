# Reality-Check Review — Tech Choices (PRD finalize gate)

**Scope:** BeMad todo app PRD + addendum, tech direction deferred to `project-context.md`.
**Date:** 2026-07-02 · **Reviewer role:** reality-check (technology soundness)

## Verdict: SOUND

All named technologies are current, actively maintained, and appropriate for a small single-user full-stack todo app. Nothing outdated, deprecated, or a poor fit. The PRD wisely keeps tech out and defers to `project-context.md`; the stack there is coherent and low-risk.

## Named technologies — status (mid-2026)

| Tech | Status | Notes |
|------|--------|-------|
| **Next.js (App Router)** | Current — v16 (16.2.x, May 2026) | App Router is the stable, recommended default. **Pages Router is now in maintenance mode**, so App Router is the correct choice going forward. `project-context.md` correctly assumes latest-stable-at-scaffold; that will resolve to Next.js 16. |
| **Next.js Route Handlers** (`app/api/**/route.ts`) | Current | Standard App Router API mechanism (Web Request/Response). Supports GET/POST/PUT/PATCH/DELETE etc. — cleanly covers the FR-20 CRUD API. No separate backend is a sound simplicity call for this scope. |
| **Vitest** (unit/integration) | Current — v4.x | Vite-native, actively maintained, standard Jest replacement. Good fit for the data-access layer, route handlers, and the deterministic rotation selector. |
| **Playwright** (E2E) | Current — v1.x, actively released | Standard E2E choice; well-suited to the core-flow + empty/loading/error-state E2E the context mandates. |
| **TypeScript strict** | Current, standard | `strict: true` + no `any` is baseline-correct. Optional `noUncheckedIndexedAccess` (already flagged in context) is a reasonable extra. |

## Notes / minor flags

1. **Persistence still undecided (intentional).** Correctly deferred to `bmad-architecture` and gated behind FR-19 (durable, server-side, survives refresh/session) with a swappable single data-access module. This is the one open risk, but it is a deliberate, well-fenced deferral — not a defect. Worth confirming the architecture stage actually picks something that satisfies FR-19 in a Next.js Route Handler runtime (e.g. SQLite/file/DB) rather than a serverless-ephemeral store.
2. **Version pinning discipline is good.** "Latest stable at scaffold, pin exact in package.json, don't invent versions" avoids the classic hallucinated-version failure. Expect Next 16 / Vitest 4 / current Playwright at scaffold time.
3. **No fit concerns for scope.** The stack is arguably slightly heavier than a demo strictly needs (full Next.js for a single-user todo), but it is a conventional, well-trodden combination — no exotic or risky pieces — so maintainability and simplicity goals (NFR-3) are not endangered.
4. **Nothing deprecated.** No legacy/dead tech present (no Pages Router, no Jest, no Enzyme, no CRA, etc.).

## Sources
- https://nextjs.org/docs/app/getting-started/route-handlers
- https://nextjs.org/blog (Next.js 16.2.x releases, App Router stable / Pages Router maintenance)
- https://github.com/vitest-dev/vitest/releases (Vitest 4.x)
- https://github.com/microsoft/playwright/releases (Playwright current)
