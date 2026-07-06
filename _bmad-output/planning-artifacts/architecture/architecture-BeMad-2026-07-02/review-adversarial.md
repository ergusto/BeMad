---
title: 'Adversarial Review — Architecture Spine (BeMad)'
type: architecture-review
mode: adversarial
target: 'ARCHITECTURE-SPINE.md'
reviewer: adversarial-finalize-gate
date: '2026-07-02'
verdict: CHANGES-REQUESTED
---

# Adversarial Review — BeMad Architecture Spine

## Verdict

**CHANGES-REQUESTED.** The spine is coherent and its layering/persistence/voice invariants are strong. But it has one **critical silence** (no owner for client data-fetch/state) and several **ambiguous-ownership seams** where two conforming developers building adjacent slices will build incompatibly. None are fatal; all are closeable with one or two tightened ADs. The dangerous ones cluster around the optimistic-mutation lifecycle (client id ↔ server id), the error-shape/voice boundary, and rotation-state ownership.

## Method

For each candidate seam I construct two units one level down that each obey **every** AD to the letter, then show they still fail to compose. Each incompatible pair is a hole; the fix is a new or tightened AD.

---

## Holes (ranked by severity)

### H1 — [CRITICAL] No owner for client data-fetching / state management
**Incompatible pair.** Dev A builds the todo-list container using SWR/React Query (cache, `mutate`, dedup, revalidate-on-focus). Dev B builds the mutation/error surfaces around a hand-rolled `useReducer` + local optimistic array. Both satisfy AD-1 (UI→API only), AD-4 (REST), AD-5 (shared type), AD-7 ("optimistic then reconcile"). Yet the two cannot share a cache: A's `mutate('/api/todos')` revalidation clobbers B's optimistic reducer, loading/error states (FR-12) are tracked twice with different truth, and rollback (FR-10) fires from two places.
**Why it slips through.** AD-7 mandates *behavior* (optimistic + rollback) but names no state container, no source-of-truth for the client list cache, and no load/refetch strategy for FR-2/FR-12. This is the single biggest structural dimension left silent — every interactive FR (FR-1–FR-13) depends on it.
**Fix — new AD.** "Client state & data access: one owner for the client-side todo collection — [name the mechanism, e.g. a single `useTodos` hook backed by one cache, or one Context+reducer]. All components read/mutate the list through it; no component fetches `/api/todos` or holds a parallel copy. Loading/error/empty state (FR-12) is derived from this one owner."

### H2 — [HIGH] Client-id ↔ server-id reconciliation contract is undefined
**Incompatible pair.** Dev A (create flow) represents a pending todo with a client-generated `tempId` and swaps it for the server UUID on resolve. Dev B (list keying / toggle-delete controls) keys React lists and "is this mutable yet?" (FR-11 / AD-7 "no server id ⇒ non-mutable") off the presence of a real `id`. If A stores the temp id in the `id` field, B's "has server id" check is fooled and lets a toggle fire against an unpersisted task; if A uses a separate `tempId` field, B never reads it and the key churns on swap, remounting rows.
**Why it slips through.** AD-7 says "a task with no server id is non-mutable" but never defines *how a pending task is represented*, *who generates the id* (DB vs API vs client temp), or *what the swap looks like*. AD-5's "one Todo type" doesn't cover the transient pending shape.
**Fix — tighten AD-7 (or new AD).** Define the pending representation and id ownership: e.g. "`id` is server/DB-generated (`gen_random_uuid()`); a not-yet-confirmed task carries a distinct client `tempId` and a `pending`/`status` flag; controls gate on that flag, never on `id` truthiness; on resolve the client replaces the record (temp→real) as a single reconcile step." State it once so all slices agree.

### H3 — [HIGH] Error `message` ownership straddles the voice boundary
**Incompatible pair.** Dev A (API handler) obeys AD-8 ("voice confined to user-facing copy; error codes/contract stay plain") and returns `{ error: { message: "Task text exceeds 1000 characters", code: "TEXT_TOO_LONG" } }` — plain. Dev B (client error surface) obeys AD-7/FR-10/FR-12 ("surface a voiced, retryable error") by rendering `error.message` straight to the toast — now the user sees a *plain, un-voiced* message (violates the voiced-error FRs). To make it voiced, either the API must put Torgue prose in `message` (violates AD-8, voice leaking into contract) or the client must map `code`→voiced copy via `lib/voice` — but **no AD says the client owns that mapping**, so the two devs diverge.
**Why it slips through.** AD-4 defines the error *shape* and AD-8 defines the *boundary*, but neither says whether `message` is plain-for-devs or user-facing, nor who translates `code` into voiced copy.
**Fix — tighten AD-4 + AD-8.** "`error.message` is plain/professional (for logs & developers); `error.code` is a stable enum. All user-facing error text is produced client-side by mapping `code` → a `lib/voice` key. The API never emits voiced strings." Add the error-code enum to the shared schema (AD-5) so both sides agree on the key set.

### H4 — [HIGH] Rotation-state ownership & scope is undefined (and SSR boundary is silent)
**Incompatible pair.** AD-9 makes the selector a pure `(key, lastShownIndex, rng)→variant`, but says nothing about *who stores `lastShownIndex` per key* or *at what scope*. Dev A holds `lastShownIndex` in each component's local state; Dev B builds a central voice provider holding a per-key map. If two surfaces render the same key with independent local state (Dev A's model), the AD-9 invariant "never the same variant twice in a row *for a given key*" is unenforceable across the app, and one control's re-roll can't inform another. Separately: FR-16(a) "on page load each surface picks a variant" — the spine never says whether the **server** (RSC) or the **client** picks. If the RSC picks with an injected RNG and the client re-picks on hydration, React throws a hydration mismatch; if only the client picks, controls flash their default first.
**Why it slips through.** AD-9 nails the function's *purity* and *properties* but not the *ownership/scope of the mutable rotation state* nor the *server/client rendering boundary* — a "what without enough how."
**Fix — tighten AD-9 (+ note under AD-1).** "Rotation state (last-shown index per key) is owned by one client-side voice module/provider at a defined scope; components request a variant from it and never hold their own index. Variant selection happens client-side (post-hydration) to avoid SSR mismatch; server-rendered copy uses a deterministic default until the client mounts." Also fix the RNG injection seam: name one injection point.

### H5 — [MEDIUM] PATCH payload shape ambiguous (partial vs full; both-fields-at-once)
**Incompatible pair.** AD-4 collapses edit and toggle onto one `PATCH /api/todos/[id]`. Dev A (edit) sends `PATCH {text}`; Dev B (toggle) sends `PATCH {completed}`. This only works if the shared update schema (AD-5) is *all-optional partial* — but then an empty `{}` PATCH is a valid no-op and the handler behavior is undefined, and it's unclear whether a single PATCH may change both fields (FR-3/FR-4/FR-10 treat edit and toggle as *separate* operations with separate rollback). If the schema requires fields, partial PATCH breaks.
**Fix — tighten AD-4/AD-5.** Define the update payload as partial with ≥1 field required, and state whether edit and toggle are mutually exclusive per request (recommended: one field per PATCH, matching the per-operation rollback in FR-10). Encode this in the shared Zod update schema.

### H6 — [MEDIUM] DB↔TS mapping boundary owned in two places
**Incompatible pair.** The conventions table says case-mapping (`snake_case` columns ↔ `camelCase` TS) happens "in the repository." AD-5 says "the DB row, API payload, and client model *derive from* [one schema]." Dev A (repository) returns already-camelCased objects. Dev B (service/API), reading AD-5 literally, assumes the shared schema *is* the DB shape and re-maps `created_at`→`createdAt` itself — double-mapping or reading a field that's already renamed (`undefined`).
**Why it slips through.** AD-5 conflates three distinct shapes (DB row, wire payload, client model) into "derive from one," while the conventions table quietly assigns mapping to the repository. The two statements don't obviously agree on where the boundary sits.
**Fix — tighten AD-5.** State explicitly: "The shared Zod/TS `Todo` is the **wire/domain** shape (camelCase). The repository is the sole boundary that maps DB rows (snake_case) ↔ domain shape; no layer above `lib/db` sees snake_case." Clarify that "derive" means the wire and client models are the *same* type; the DB row is a repository-internal concern.

### H7 — [MEDIUM] Health check needs DB access but AD-2 forbids DB clients outside lib/db
**Incompatible pair.** AD-12 requires `GET /api/health` to verify DB connectivity. AD-2 forbids any DB client outside `lib/db`, and AD-1 requires the route to reach data via the service/repository. Dev A (ops) imports the DB client into the health route to `SELECT 1` (violates AD-2). Dev B (repository author) never exposed a ping/health method, so a conforming Dev A has no sanctioned way to check connectivity.
**Fix — tighten AD-2/AD-12.** Add a `TodoRepository.healthcheck()` (or `ping()`) to the repository port; the health route calls it. State that connectivity verification is a repository responsibility.

### H8 — [LOW] List ordering source-of-truth split between API and client
**Incompatible pair.** The capability map puts sort (FR-8) in `app/` (client). Dev A (API `GET`) returns newest-first by default; Dev B (client) also sorts. Double-sort is mostly harmless, but tie-breaks/stability (e.g. alphabetical with equal text, or "active-before-completed" secondary order) can differ between a Postgres `ORDER BY` and a JS `.sort`, producing visibly different orders depending on which one "wins."
**Fix — clarify.** State the single source of order: either "API returns unordered/creation-ordered; client owns all sort semantics (FR-8) and tie-breaks by `id`," or vice versa. Pick one; don't sort in both.

---

## Silent structural dimensions

1. **Client data-fetch/state container (H1)** — the largest gap; unowned entirely.
2. **Server vs client rotation/render boundary (H4)** — SSR hydration hazard, unaddressed given App Router + RSC.
3. **Transient/pending task identity & id generation (H2)** — the optimistic lifecycle's data shape is undefined.
4. **NFR-1 measurement** — ≤500 ms p95 reconciliation has no owner and no test in AD-13's E2E list; ≤100 ms is satisfied by construction (optimistic). Acceptable to leave qualitative for a demo, but note it.
5. **`updated_at` / edit metadata** — ERD has only `created_at`; FR-3 edits leave no trace. Not required by any FR (only `createdAt` is), so acceptable — flagged for awareness, not a hole.

## Contradiction check vs PRD / project-context.md

- **Persistence choice (Drizzle/Postgres):** project-context said persistence is "NOT chosen — decided in architecture." The spine deciding it here is correct, not a contradiction. ✔
- **API = Route Handlers, no separate backend:** AD-4/seed conform to project-context. ✔
- **Voice boundary, rotation determinism, a11y (stored caps, stable aria):** AD-8/9/10 faithfully encode project-context's strictest rules. ✔
- **Next.js 16.x / React:** project-context says only "App Router + React, latest stable at scaffold." Pinning 16.x is a forward call (Next 16 is aggressive/new); consistent with "latest stable at scaffold time" but worth a sanity check at scaffold that 16.x is actually stable then. Minor. ✔ (no contradiction)
- **AD-13 "70% coverage":** not in the PRD/NFRs — an added floor, not a contradiction. ✔
- No AD contradicts the PRD or project-context. The issues above are *gaps/ambiguities*, not conflicts.

## Recommended new/tightened ADs (summary)

- **New AD (H1):** single client-side owner for the todo collection + fetch/loading/error state.
- **Tighten AD-7 (H2):** pending-task representation, id ownership, temp→real reconcile step.
- **Tighten AD-4+AD-8 (H3):** `message` plain, `code` enum in shared schema, client owns code→voice mapping.
- **Tighten AD-9 (H4):** rotation-state ownership/scope + client-side (post-hydration) selection.
- **Tighten AD-4/AD-5 (H5):** partial-update schema, one field per PATCH.
- **Tighten AD-5 (H6):** repository is the sole snake↔camel mapping boundary; shared type is the wire/domain shape.
- **Tighten AD-2/AD-12 (H7):** `TodoRepository.healthcheck()` for the health route.
- **Clarify (H8):** single source of list ordering.
