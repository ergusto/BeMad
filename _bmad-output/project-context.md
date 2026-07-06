---
project_name: 'BeMad'
user_name: 'ergusto'
date: '2026-07-02'
sections_completed: ['technology_stack', 'language', 'framework', 'voice_pack', 'testing', 'code_quality', 'workflow', 'dont_miss']
existing_patterns_found: 0
---

# Project Context for AI Agents

_Critical rules and patterns AI agents MUST follow when implementing code in BeMad. Focus is on unobvious, project-specific details — generic best practices are assumed, not repeated._

> **Status:** Architecture settled (`bmad-architecture`, 2026-07-02). The authoritative contract is `_bmad-output/planning-artifacts/architecture/architecture-BeMad-2026-07-02/ARCHITECTURE-SPINE.md` (AD-1…AD-14) — follow it; the rules below are its consistency layer.

---

## Technology Stack & Versions

- **Language:** TypeScript, **strict mode on** (`strict: true`). No `any`.
- **Framework:** Next.js (**App Router**, `app/` directory) with React.
- **Backend:** Next.js **Route Handlers** (`app/api/**/route.ts`) — this IS the "small, well-defined API" from the brief. No separate backend service.
- **Runtime:** Node.js **24 LTS**.
- **Testing:** **Vitest** (unit/integration) + **Playwright** + **@axe-core/playwright** (E2E + a11y). Target **≥70% meaningful coverage** and **≥5 E2E** tests.
- **Persistence:** **PostgreSQL 18** (containerized), accessed **server-side only** through the single `TodoRepository` in `lib/db` (AD-2/AD-3). ORM: **Drizzle** (behind the repository — swappable; pin exact, it's pre-1.0). Do not open any other DB path.
- **Deployment:** **Docker Compose** — multi-stage Dockerfile (non-root, `HEALTHCHECK`) for the app + a `db` (Postgres) service; named volume; dev/test compose profiles; `GET /api/health` via `repo.healthcheck()` (AD-12).
- **Versions:** Pin exact versions in `package.json`/Dockerfile at scaffold. Do not invent versions.

## Critical Implementation Rules

### The Voice Pack (most important project-specific rule)

The app's personality — Mr. Torgue–voiced, rotating copy — is a first-class product feature with strict handling rules:

- **All user-facing copy lives in ONE centralized voice-pack module.** Never hardcode user-facing strings in components/JSX. If a string appears on screen, it comes from the voice pack.
- **Each copy key maps to an array of ~5 semantically-identical variants.** All variants of a key mean exactly the same thing.
- **Rotation:** a variant is picked per surface on page load; **interactive controls re-roll their label on every interaction.** Never show the same variant twice in a row for a given key.
- **Scope of the voice is user-facing copy ONLY.** Code identifiers, comments, commit messages, logs, error codes, API field names, and docs stay **plain and professional** — never Torgue.
- **Profanity is bleeped** (`F***`), never uncensored.
- **Clarity beats comedy:** every variant must unambiguously convey the action. Humor never obscures what a control does.
- **Accessibility:** apply ALL-CAPS via CSS `text-transform`, never by storing shouty strings. Keep `aria-label`/role **stable and descriptive** even as the visible label rotates.

### Language-Specific Rules (TypeScript strict)

- Prefer `unknown` + narrowing over `any`. Consider `noUncheckedIndexedAccess`.
- **One shared `Todo` domain type**, defined once and imported by both client and API route handlers. Never redefine the todo shape in two places.
- ES modules only. Use configured path aliases, not deep relative `../../..` chains.
- Handle errors at explicit boundaries (API handler + client mutation); do not let rejections surface raw to the user.

### Framework-Specific Rules (Next.js App Router)

- **Server Components by default**; add `'use client'` only where interactivity requires it (the todo list interactions are client-side).
- API lives in Route Handlers under `app/api/todos/` (collection) and `app/api/todos/[id]/` (item). CRUD maps to HTTP verbs; return consistent JSON shapes and proper status codes.
- **Optimistic UI updates are required** (the brief mandates instant feel): update local state immediately on add/edit/toggle/delete, then reconcile with the server and **roll back on failure**, surfacing a voice-pack error message.
- Keep empty, loading, and error states as first-class UI — all three exist and all use voice-pack copy.

### Testing Rules

- **Vitest** for the data-access layer, API route handlers, and the rotation selector logic. **Playwright** for E2E of the core flows.
- **The rotation selector must be deterministic-testable:** inject the randomness/seed (do NOT call `Math.random()` inside components). Tests must assert (a) no back-to-back repeats and (b) all variants are reachable.
- E2E must cover: create, edit-in-place, toggle complete↔active, delete (with confirm), and the empty/loading/error states.
- **Persistence durability is a tested requirement:** a created todo survives a reload and a new session.

### Code Quality & Style Rules

- ESLint + Prettier; TypeScript strict. Files `kebab-case`, React components `PascalCase`, variables/functions `camelCase`.
- **Review/lint guard:** reject literal user-facing strings in JSX — they belong in the voice pack.
- **Bias to simplicity** (brief mandate): no premature abstractions, no dependencies that don't earn their place. This is a deliberately small app.

### Development Workflow Rules

- Repo is **already initialized with git** (do NOT run `git init`). Conventional Commits suggested; commit messages stay plain/professional (never Torgue).
- No time estimates anywhere — they're meaningless for AI-paced development.

### Critical Don't-Miss Rules

- **Don't hardcode single-user assumptions** that would block adding auth/multi-user later (e.g. leave room for an `owner` concept in the data model) — but **do not build auth in v1**.
- **Don't assume a database.** Route all reads/writes through the data-access module so the store chosen in architecture can be swapped without touching UI or handlers.
- **Persistence must be durable server-side**, not `localStorage`-only — data is consistent across refreshes and sessions.
- **Never leak the Torgue voice** into code, logs, comments, or API contracts.
- **Never break accessibility** with stored caps or rotating `aria-label`s.
