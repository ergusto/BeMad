---
baseline_commit: NO_VCS
---

# Story 1.3: Create and view tasks (with validation)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to add a task and immediately see my full list,
so that I can capture and review what I need to do with no setup.

## Acceptance Criteria

1. **Given** the app is open, **when** the page loads, **then** `GET /api/todos` returns the persisted tasks and they render in the list (or an empty list if none).
2. **When** I submit a new task's text, **then** `POST /api/todos` validates server-side via the shared Zod schema (trim, reject empty/whitespace-only, cap 1000 code points), persists it, and it appears in the list with its creation time.
3. **And** invalid input returns `{ error: { code, message } }` with a 4xx status and is surfaced to the user; the client mirrors the same validation (the shared schema) for instant feedback before the request (FR-9).
4. **And** task text is rendered via React's automatic escaping only — never `dangerouslySetInnerHTML` (AD-11).
5. **And** the API contract follows AD-4: `GET /api/todos` → `200` + `Todo[]` (creation order); `POST /api/todos` → `201` + the created `Todo`; errors → `{ error: { code, message } }` with `code` from a shared enum and a **plain, un-voiced** `message`.

## Tasks / Subtasks

- [x] **Task 1 — Shared API error envelope + error-code enum** (AC: #3, #5)
  - [x] Create `lib/http.ts` with the AD-4 error contract: an `ErrorCode` enum/union (start with `VALIDATION_ERROR`, `INVALID_JSON`, `INTERNAL`; `NOT_FOUND` arrives with the `[id]` route in Stories 1.4–1.6) and a helper `jsonError(code, message, status)` returning `Response.json({ error: { code, message } }, { status })`.
  - [x] Messages are **plain, un-voiced** (AD-8 voice-scope boundary). The client maps `error.code` → voiced copy in Epic 3 (Story 3.3); do NOT add voice here. Keep `code` a stable, shared string enum so the client can map it later.
- [x] **Task 2 — Collection route handler `app/api/todos/route.ts`** (AC: #1, #2, #5)
  - [x] `export const runtime = "nodejs"` and `export const dynamic = "force-dynamic"` (the pg driver needs Node; the list must not be cached) — mirror the health route.
  - [x] `GET`: `return Response.json(await getRepository().list(), { status: 200 })`. Wrap in try/catch at the handler boundary → `jsonError("INTERNAL", …, 500)` on failure (project-context error-boundary rule); never leak a raw rejection.
  - [x] `POST`: parse the body with `await request.json()` inside try/catch → on parse failure return `jsonError("INVALID_JSON", …, 400)`. Validate with `createTodoSchema.safeParse(body)` (AD-6 server-authoritative); on failure return `jsonError("VALIDATION_ERROR", <plain message from the Zod issue>, 400)`. On success `const todo = await getRepository().create(parsed.data)` and return `Response.json(todo, { status: 201 })`.
  - [x] Reach data ONLY via `getRepository()` (AD-1/AD-2). Do NOT import the DB client or `lib/db/*` internals beyond the repository accessor.
- [x] **Task 3 — Thin client API wrapper `lib/todos-client.ts`** (AC: #1, #2, #3)
  - [x] `fetchTodos(): Promise<Todo[]>` → `GET /api/todos`; on non-2xx, parse the `{ error }` envelope and throw an error carrying `error.code` + `message`.
  - [x] `createTodo(input: CreateTodoInput): Promise<Todo>` → `POST /api/todos` with JSON body; same error handling.
  - [x] This is a **fetch wrapper only**, NOT the state store. AD-14's single client-side state owner is **Story 2.1's** job; write this so 2.1's store consumes these functions rather than re-implementing fetch. Do not build optimistic updates, caching, or the full loading/error state machine here.
- [x] **Task 4 — Minimal client UI: list + add form** (AC: #1, #2, #3, #4)
  - [x] Create a client component (e.g. `app/todo-app.tsx`, `"use client"`) that on mount calls `fetchTodos()` and renders the list; submitting the add form calls `createTodo()` then refreshes the list (re-fetch or append the returned todo).
  - [x] Render each task's `text` as plain JSX text (React auto-escapes) and show its `createdAt`. **Never** use `dangerouslySetInnerHTML` (AD-11).
  - [x] Client-side validation mirror: validate the input with `createTodoSchema` (the SAME shared schema — AD-5) before POSTing; on failure show the plain message and don't send the request. On a server error, surface the returned plain message.
  - [x] Keep it minimal and plain-copy. Full empty/loading/error states (FR-12), optimistic updates (FR-10), sort (FR-8), and the Torgue voice (Epic 3) are LATER stories — a basic "loading…"/error line is fine but do not build the state machine here.
  - [x] Update `app/page.tsx` to render the client component (replace the scaffold placeholder). `page.tsx` stays a Server Component that renders the client component (Server Components by default; `'use client'` only where interactivity requires it).
- [x] **Task 5 — Tests** (AC: #1–#4)
  - [x] **NEW** `tests/integration/todos-route.test.ts` — call the route handlers against a real test Postgres (migrate + truncate, like the repository test): `POST` rejects empty / whitespace-only / >1000-code-point text with `400` + `{ error: { code: "VALIDATION_ERROR", message } }`; `POST` valid → `201` + the created todo; malformed JSON → `400` `INVALID_JSON`; `GET` returns the created rows (and `[]` when empty). Gate on `TEST_DATABASE_URL` (skip when unset).
  - [x] **NEW** `tests/unit/todos-client-validation.test.ts` (or extend an existing unit file) — the client validation mirror uses `createTodoSchema` and rejects the same invalid inputs the server does (FR-9 parity). Pure/unit, no DB.
  - [x] **NEW** `tests/e2e/create-view.spec.ts` — Playwright: user types a task, submits, sees it in the list; **reload → the task persists** (durability). Configure Playwright's `webServer` to boot the app against a test DB. NOTE: executing E2E needs browser binaries (`npx playwright install`) + a running app + DB; write the spec and wire `webServer` now, and run it if the environment allows. The full ≥5-test E2E suite is formally green in Story 4.1 — do not block this story solely on local browser execution, but the spec MUST exist and be correct.
  - [x] Typecheck + lint clean; full Vitest suite green with `TEST_DATABASE_URL` set; no regressions to health/repository/schema tests.

## Review Findings

_Code review 2026-07-06 — adversarial layers: Blind Hunter + Edge Case Hunter + Acceptance Auditor. Acceptance Auditor: all 5 ACs + invariants (AD-1/2/4/5/6/8/11) **pass**. Triage: 0 decision-needed, 4 patch, 1 deferred, 4 dismissed._

- [x] [Review][Patch] Client race + double-submit + lost keystrokes in `app/todo-app.tsx`: submitting before the initial `fetchTodos` resolves lets the late `setTodos(loaded)` clobber the just-created todo (and it's hidden while `loading`); `disabled={submitting}` only applies after re-render, so a fast double-click / Enter re-enters `handleSubmit` → duplicate POST; and the input isn't disabled during submit → in-flight keystrokes are cleared on success. Fix: `if (loading || submitting) return` guard + disable the button while `loading||submitting` and the input while `submitting` [app/todo-app.tsx]
- [x] [Review][Patch] `lib/todos-client.ts` parses the success body with `await res.json()` outside any try/catch — a 2xx with an empty/non-JSON body (e.g. a proxy HTML page) throws a raw `SyntaxError` instead of a `TodoApiError` [lib/todos-client.ts fetchTodos/createTodo]
- [x] [Review][Patch] E2E flakiness under `fullyParallel` + shared DB: `validation.spec.ts` snapshots the `li` count then asserts it unchanged, but a parallel `create-view` insert can bump it between snapshot and assertion; and `create-view.spec.ts` interacts without waiting for the loading state to settle (hydration race). Fix: drop the count assertion (keep the error-text assertion) and add a loading-settled wait to create-view [tests/e2e/validation.spec.ts, tests/e2e/create-view.spec.ts]
- [x] [Review][Patch] Test gap: no coverage that POST rejects a non-string / non-object `text` (`{text: 123}`, `null`, array body) — the classic type-confusion bypass. The schema already rejects these (Zod `z.string()` does not coerce); add the tests to prove it [tests/integration/todos-route.test.ts]
- [x] [Review][Defer] E2E has no test-DB isolation/cleanup wiring — `webServer` runs `npm run dev` against ambient `DATABASE_URL`, and `create-view` persists a durable row per run; risks polluting a real DB and cross-run accumulation. Deferred to Story 4.1, which assembles the full ≥5-test E2E suite with the `test` compose profile + cleanup [playwright.config.ts, tests/e2e/*]

_Dismissed (with evidence): "Vitest `resolve.tsconfigPaths` is invalid → suite can't import `@/`" — refuted, **65/65 tests ran** and resolved the alias (valid in Vitest 4 since Story 1.1); `toLocaleString` "Invalid Date"/non-determinism — the server contract guarantees a valid ISO string (`todoSchema` + repository `toDomain`), and locale display is intended; client `as`-cast without full runtime re-validation — same-origin API already validated server-side (AD-5/6), full client re-validation is over-engineering vs the simplicity mandate (the concrete success-body crash IS fixed as patch 2); `setState` after unmount in `handleSubmit` — React 18 no-ops, and this component is restructured into the single store in Story 2.1._

**Resolution (2026-07-06):** all 4 patch findings applied and verified. (1) `handleSubmit` guards `if (loading || submitting) return`, button disabled while `loading||submitting`, input disabled while `submitting` — closes the load-vs-create race, double-submit, and lost-keystroke gaps. (2) client success bodies parsed via `parseJson()` → `TodoApiError` on malformed JSON. (3) validation E2E drops the flaky count assertion (keeps the error-text assertion), both E2E specs wait for the loading state to clear before interacting. (4) +4 type-confusion integration tests (`{text:123}`/`null`/null-body/array-body → 400). Post-fix: typecheck + lint clean; **69/69 Vitest** vs real Postgres 18; **2 E2E pass** on Chromium. The 1 deferred item (E2E test-DB isolation/cleanup) is recorded in `deferred-work.md` for Story 4.1.

## Dev Notes

### What this story adds (first UI + first API routes)

This is the first story that produces user-facing UI and HTTP route handlers. It **consumes** what Stories 1.1–1.2 built:

- `getRepository()` + `PostgresTodoRepository.create()/list()` (Story 1.2) — the data access.
- `createTodoSchema` / `Todo` / `CreateTodoInput` from `lib/todos` (Story 1.2) — the shared validation + shape, used on BOTH server (handler) and client (form mirror). This is the AD-5 payoff: one schema, two consumers.
- The health route (`app/api/health/route.ts`) is the pattern to copy for `runtime`/`dynamic`/try-catch.

### Scope fences (do NOT build these here)

- **Item route** `app/api/todos/[id]/route.ts` (PATCH/DELETE) → Stories 1.4 (edit), 1.5 (toggle), 1.6 (delete). This story is the **collection** route only (`GET`/`POST`).
- **Single client state store** (AD-14) + explicit empty/loading/error states (FR-12) → **Story 2.1**. Here: a minimal client component with a thin fetch wrapper. Write it so 2.1 consolidates it into the one store — do NOT create a second competing state owner later, and do NOT over-build the store now.
- **Optimistic updates + rollback** (FR-10/11) → Story 2.2. Here: plain create-then-refresh.
- **Sort** (FR-8) → Story 2.3. `GET` returns creation order.
- **The Torgue voice** (FR-14–20) → Epic 3. Here all copy is plain; error `message` is plain and `error.code` is a stable enum the client will map to voiced copy in Story 3.3.

### Architecture compliance (guardrails)

- **AD-1 layering:** UI → API → service → repository. The route handler is the API layer and reaches data only via `getRepository()`. The client (browser) reaches data only via `fetch` to `/api/todos` — never imports `lib/db`.
- **AD-4 REST contract:** `GET /api/todos` (list) + `POST /api/todos` (create); JSON; success 200/201; errors `{ error: { code, message } }` with `code` from the shared enum. (PATCH/DELETE + `/[id]` are later.)
- **AD-5 shared schema:** import `createTodoSchema`/`Todo` from `lib/todos`; do not redefine the shape or re-validate with a different schema. Server and client use the same schema.
- **AD-6 server-authoritative validation:** the handler validates every create; the client mirror is UX-only, never the authority.
- **AD-8 voice-scope boundary:** error `code`/`message`, logs, and field names stay plain; no Torgue. Client voice mapping is Epic 3.
- **AD-11 XSS-safe:** task text rendered only through React escaping; `dangerouslySetInnerHTML` forbidden for task-derived content.
- **Next App Router:** Server Components by default; add `'use client'` only to the interactive todo component. Route Handlers under `app/api/todos/`.
- **Conventions:** files `kebab-case`; React components `PascalCase`; consistent JSON shapes + status codes.

### Files this story touches

- **NEW:** `app/api/todos/route.ts` (GET+POST), `lib/http.ts` (error envelope + `ErrorCode`), `lib/todos-client.ts` (fetch wrapper), the client UI component (e.g. `app/todo-app.tsx`)
- **UPDATE:** `app/page.tsx` (render the client component instead of the placeholder)
- **NEW tests:** `tests/integration/todos-route.test.ts`, `tests/unit/todos-client-validation.test.ts`, `tests/e2e/create-view.spec.ts` (+ Playwright `webServer` config in `playwright.config.ts`)
- **PRESERVE (no regression):** everything from 1.1–1.2 — repository, schema, health route/tests, client/singleton.

### Testing standards summary

- **Route-handler integration** against real Postgres (AD-13): import `GET`/`POST` from the route module, invoke with a `Request` (e.g. `new Request("http://localhost/api/todos", { method: "POST", body: JSON.stringify({ text }) })`), assert status + JSON. Set `DATABASE_URL`/`TEST_DATABASE_URL` and migrate + truncate per test. The handler uses the `getRepository()` singleton — set env before importing, and `closeRepository()` in teardown (see Story 1.2's `db-index` test for the reset pattern).
- **Client validation mirror**: unit test the shared-schema check the form uses (FR-9 parity).
- **E2E** (Playwright + `webServer`): create → visible → reload persists. Executing needs browsers + app + DB; the spec must exist and be correct now, formally run in Story 4.1.
- Deterministic, isolated, self-cleaning; ≥70% coverage floor is gated in Story 4.2.

### Learnings carried from Stories 1.1–1.2 (apply them)

- **Malformed-UUID handling** already lives in the repository (`get/update/delete` return null/false) — not needed for GET/POST here, but relevant when the `[id]` routes land (1.4+). Those routes should still validate the `[id]` param and return `404`/`400` via the envelope.
- **Zod 4 API**: `z.uuid()`, `z.iso.datetime()` (not the deprecated `z.string()` forms). Validation errors: use `safeParse` and surface `result.error.issues[0].message` (plain).
- **`createTodoSchema` already trims and rejects empty/whitespace/>1000 code points and NUL bytes** — the handler just calls it; do NOT re-implement these rules.
- **Route pattern**: copy `runtime="nodejs"` + `dynamic="force-dynamic"` + handler-boundary try/catch from `app/api/health/route.ts`.
- **Test-DB flow**: `docker compose --profile test up -d --wait db-test`, `TEST_DATABASE_URL=…5433…`, migrate via `drizzle-orm/postgres-js/migrator`, truncate between tests.
- **Env/tooling**: git already initialized (do NOT `git init`); Node 24 pinned; deps already installed (Next 16, React 19, Zod 4, Drizzle) — no new dependencies expected. If you believe a new dependency is needed, HALT and ask.

### Latest tech information

- **Next 16 Route Handlers**: `export async function GET(request: Request)` / `POST(request: Request)` returning `Response`/`Promise<Response>`; `Response.json(data, { status })`; `await request.json()` throws on invalid JSON (catch it). Segment config `runtime`/`dynamic` as in the health route.
- **Playwright `webServer`**: add a `webServer` block to `playwright.config.ts` to boot the app for E2E (command to start the app, `url`, `reuseExistingServer`), and point it at a test DB via env. Browsers install via `npx playwright install`.
- No new packages needed; everything is already pinned/installed from Stories 1.1–1.2.

### Project Structure Notes

- Adds `app/api/todos/route.ts` and the client UI under `app/`, matching the spine seed (`app/` = UI + API; `app/api/todos/route.ts` for the collection). `lib/http.ts` is a small shared cross-cutting module (error contract) — acceptable addition; alternatively colocate under `lib/` per convention.
- `lib/store/` remains a placeholder until Story 2.1 (do not populate it here).

### References

- [Source: planning-artifacts/epics.md#Story-1.3] ACs + tests
- [Source: .../ARCHITECTURE-SPINE.md#AD-1] layering (UI→API→service→repository)
- [Source: .../ARCHITECTURE-SPINE.md#AD-4] REST contract + error envelope `{ error: { code, message } }`, code = shared enum
- [Source: .../ARCHITECTURE-SPINE.md#AD-5] shared schema (server + client)
- [Source: .../ARCHITECTURE-SPINE.md#AD-6] server-authoritative validation
- [Source: .../ARCHITECTURE-SPINE.md#AD-8] voice-scope boundary (plain error text; client maps code→voice in Epic 3)
- [Source: .../ARCHITECTURE-SPINE.md#AD-11] XSS-safe rendering (no dangerouslySetInnerHTML)
- [Source: .../ARCHITECTURE-SPINE.md#AD-14] single client store is Story 2.1 (seam noted)
- [Source: implementation-artifacts/1-2-todo-data-model-shared-zod-schema-repository.md] repository CRUD, shared `createTodoSchema`/`Todo`, test-DB flow, Zod 4 API
- [Source: implementation-artifacts/1-1-project-scaffold-containerized-environment.md] health route pattern, runtime/dynamic, git-already-initialized note
- [Source: _bmad-output/project-context.md] no hardcoded user-facing strings rule (voice is Epic 3), error boundaries, optimistic UI (Epic 2), strict TS

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (Opus 4.8, 1M context)

### Debug Log References

- **Test-parallelism bug found & fixed:** adding a second integration file (`todos-route.test.ts`) alongside `repository.test.ts` caused 3 failures — both files hit the same `TEST_DATABASE_URL` Postgres and their `truncate todos` between tests clobbered each other under Vitest's default file-parallelism. Fixed with `fileParallelism: false` in `vitest.config.ts` (integration files now run sequentially against the shared DB). Suite went 57/60 → 60/60.
- **Route-handler test harness:** import `GET`/`POST` from the route module, set `DATABASE_URL` in `beforeAll` before the first handler call (the `getRepository()` singleton reads it lazily), `migrate()` + `truncate` per test, `closeRepository()` in `afterAll`. Requests built with `new Request(url, { method, headers, body })`.
- **E2E actually executed** (not just written): installed Chromium via `npx playwright install chromium`, configured Playwright `webServer` (`npm run dev`), pointed the app at the test DB, and ran `create-view.spec.ts` on chromium — **passed** (create → visible → reload → still visible, proving durable persistence).
- **Zod 4** error surfacing: `parsed.error.issues[0]?.message` (guarded for `noUncheckedIndexedAccess`).

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- **Story complete and verified.** All 5 ACs, 5 tasks / 23 subtasks satisfied.
- **What was built:** shared API error envelope + `ErrorCode` enum (`lib/http.ts`); collection route `app/api/todos/route.ts` (`GET` list → 200 `Todo[]`, `POST` create → 201; `VALIDATION_ERROR`/`INVALID_JSON`/`INTERNAL` via the envelope); thin client fetch wrapper (`lib/todos-client.ts`, `TodoApiError`); minimal client UI (`app/todo-app.tsx`) with the add form + list, wired into `app/page.tsx`.
- **AD-5 payoff realised:** the SAME `createTodoSchema` validates on the server (handler, authoritative) and mirrors on the client (form, instant feedback).
- **AD-11:** task text rendered as plain JSX (React-escaped); no `dangerouslySetInnerHTML`.
- **Verification:** typecheck ✅ · lint ✅ · **60/60 Vitest** vs real Postgres 18 (route integration + client unit + prior suites); 39 pass / 21 skip without a DB. **E2E create-view passed** on Chromium against the running app.
- **Scope fences honoured:** collection route only (no `[id]` PATCH/DELETE → 1.4–1.6); minimal client component, no single-store/state-machine (→ 2.1), no optimistic updates (→ 2.2), no sort (→ 2.3); plain copy, no voice (→ Epic 3). The `lib/todos-client.ts` wrapper is written for 2.1's store to consume.

### File List

**New:**
- `lib/http.ts` — AD-4 error envelope + `ErrorCode` enum + `jsonError`
- `app/api/todos/route.ts` — `GET` (list) + `POST` (create) collection handlers
- `lib/todos-client.ts` — client fetch wrapper (`fetchTodos`/`createTodo`) + `TodoApiError`
- `app/todo-app.tsx` — client UI (add form + list)
- `tests/integration/todos-route.test.ts` — route handlers vs real Postgres
- `tests/unit/todos-client.test.ts` — client wrapper (mocked fetch) + FR-9 validation-mirror parity
- `tests/e2e/create-view.spec.ts` — create/view + reload-persist E2E
- `tests/e2e/validation.spec.ts` — empty-submit validation E2E (added during test-automation expansion)

**Modified:**
- `app/page.tsx` — renders `<TodoApp />` (replaced the scaffold placeholder)
- `playwright.config.ts` — added `webServer` block to boot the app for E2E
- `vitest.config.ts` — `fileParallelism: false` (integration files share one DB)

## Change Log

| Date | Change |
| ---- | ------ |
| 2026-07-06 | Story 1.3 drafted (ready-for-dev): first UI + collection API route (GET/POST /api/todos), shared error envelope, client fetch wrapper + validation mirror, create/view + reload-persist E2E. |
| 2026-07-06 | Story 1.3 implemented: `lib/http.ts` error envelope; `app/api/todos/route.ts` GET+POST with server-authoritative Zod validation; `lib/todos-client.ts` fetch wrapper; `app/todo-app.tsx` minimal create/view UI (React-escaped, AD-11). Fixed integration-test cross-DB clobbering via `fileParallelism: false`. 60/60 Vitest vs real Postgres 18; create-view E2E executed & passed on Chromium. Status → review. |
| 2026-07-06 | Test-automation expansion (bmad-tea → automate): +6 tests (NUL→400, creation order, envelope shape, client UNKNOWN fallbacks, validation E2E). 65 Vitest + 2 E2E; coverage 96.42% stmts / 95.23% branch. |
| 2026-07-06 | Code review (Blind + Edge + Auditor): all ACs/invariants pass; 4 patches applied (component race/double-submit/keystroke guard; client success-body parse guard; E2E flakiness fixes; type-confusion tests), 1 deferred (E2E test-DB isolation → 4.1), 4 dismissed (incl. a refuted "vitest alias broken" false positive). Post-fix 69/69 Vitest + 2 E2E green. Status → done. |
