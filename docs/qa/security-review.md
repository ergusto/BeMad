# Security Review — BeMad

**Story:** 4.3 (Security & performance review) · **Focus:** XSS on rendered task text (AD-11).
**Result:** ✅ **XSS-safe.** No `dangerouslySetInnerHTML`; script-injection payloads render as inert text and never execute — proven by E2E, including a real-DB round-trip.

## XSS — user-controlled task text (AD-11)

- **No raw-HTML sink.** `dangerouslySetInnerHTML` appears **nowhere** in `app/` or `lib/` (grep). There is no other HTML-parsing path in JSX.
- **All user text renders through React escaping.** Task text is a React child (`<span className="todo-text">{entry.text}</span>` in `app/todo-app.tsx`, plus `{message.text}` etc.), and where text appears in attributes it's interpolated into `aria-label={`Completed: ${entry.text}`}` — React escapes both text children and string attributes. A `<script>` or `onerror` payload becomes literal, inert text.
- **Automated proof:** [`tests/e2e/security.spec.ts`](../../tests/e2e/security.spec.ts) creates tasks with two vectors and asserts each is inert:
  - `<script>window.__xss = true</script>`
  - `<img src=x onerror="window.__xss = true">`
  For each: the row's `.todo-text` equals the **literal payload string**; the row contains **no real `<script>`/`<img>` element**; and `window.__xss` stays **`undefined`** (nothing executed). The test then opens a **brand-new browser context** (real Postgres round-trip) and re-asserts all three — proving persistence doesn't reintroduce a vector.

## Other surfaces (already hardened — reaffirmed, not new work)

- **SQL injection:** the repository uses Drizzle ORM parameterized queries (`lib/db/repository.ts`); no string-built SQL.
- **Input validation:** `todoTextSchema` (`lib/todos/index.ts`) trims, bounds length to 1000 code points, and rejects the NUL character — malformed input fails as a clean 4xx, not a 500.
- **No message leakage:** the API returns coded errors; the client maps codes to voiced copy (AD-8) and never renders raw server/DB messages.
- **Headers/transport, auth:** out of scope for v1 by design — no authentication (NFR-6 leaves room for a future `owner`), and deployment-level headers/TLS are an infra concern outside the app code.

## Scope / limitations

This review targets the app-level XSS surface mandated by AD-11 (rendered task text) and notes adjacent, already-mitigated vectors. It is not a full penetration test; there is no auth/session surface in v1.

## How to run locally

```bash
docker compose --profile test up -d --wait db-test
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npm run db:migrate
DATABASE_URL=postgres://bemad:bemad@localhost:5433/bemad_test npx playwright test security
```
