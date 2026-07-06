# Reality-Check Review — Stack Versions (BeMad Architecture Spine)

**Reviewer role:** Reality-check / finalize gate
**Date:** 2026-07-02
**Target:** `ARCHITECTURE-SPINE.md`
**Verdict:** SOUND with two version corrections (both minor, non-blocking)

The stack is a coherent, current, well-fitted choice for a small unified full-stack todo app. Every named technology exists, is actively maintained, and is a sensible fit. Two version numbers should be adjusted to match "current stable / current LTS" reality as of mid-2026; neither is broken or deprecated.

---

## Per-technology findings

### Next.js (App Router) + React — committed `16.x` ✅ CONFIRMED
- Next.js 16 shipped stable (October 2025); current stable is **16.2.x** (16.2.7 as of June 2026, with a 16.3 line adding AI features).
- App Router is the default and recommended router in 16; Turbopack and React Compiler support are stable by default.
- Runs on React 19.2 features (Server/Client Components).
- **Fit:** Excellent for a unified full-stack app — Route Handlers under `app/api` give exactly the UI+API-in-one-app topology the spine describes. No change needed. Pin to the latest 16.2.x/16.3.x at scaffold.

### Node.js runtime — committed `22 LTS` ⚠️ CORRECT TO `24 LTS`
- **Node 22 is now Maintenance LTS, not the active LTS.** As of mid-2026 the **active LTS line is Node.js 24** (Node 26 is the non-LTS Current, promoting to LTS in October 2026).
- Node 22 is still supported (maintenance through ~2027) and would work, but for a fresh 2026 greenfield build the correct "current LTS" target is **Node.js 24 LTS**.
- Note: Node.js is moving to one major/year starting with Node 27; every future release becomes LTS. Doesn't affect the choice, just context.
- **Recommendation:** Change `Node.js runtime | 22 LTS` → **`24 LTS`** in the Stack table and pin `24` in the Dockerfile base image + `engines`/`.nvmrc`.

### PostgreSQL — committed `17.x` ⚠️ PREFER `18.x` (17.x acceptable)
- **Postgres 18 is the current major** (released September 2025; current minor 18.4, May 2026). Postgres 19 is in beta (Beta 1, June 2026) with GA expected ~Sept/Oct 2026.
- Postgres 17 is one major behind but **fully supported** (17.10 current) with years of support remaining — not deprecated, not a bad choice.
- PG18 brings relevant niceties for this app: native **`uuidv7()`** (better-indexing UUIDs — directly useful since the schema uses `uuid id PK`), virtual generated columns, and a faster I/O subsystem.
- **Recommendation:** Bump to **`18.x`** to match "current stable" and gain `uuidv7()`. Not blocking — 17.x is safe if the team prefers maximum maturity. Either way, pin an explicit minor in `docker-compose.yml`.

### Drizzle ORM (behind the repository) — committed `latest stable [ASSUMPTION]` ✅ SOUND CHOICE
- Drizzle is one of the two leading TS ORMs in 2026, production-proven (Neon, Vercel Postgres, Supabase, Turso). Current line is **0.44/0.45**.
- **Version caveat:** Drizzle is still pre-1.0 (0.x). The `latest stable` label is fine, but pin an exact 0.4x version — 0.x minors can carry breaking changes.
- **Fit vs. Prisma behind a repository port (AD-2):** Drizzle is the *better* fit here. Its code-first, SQL-close, zero-dependency (~7kb) design sits cleanly behind a hand-written `TodoRepository` interface and maps naturally to the `snake_case` columns → `camelCase` fields convention. Prisma 7 is also viable (now TS/WASM engine, ~1.6MB) but its schema-first abstraction is heavier than needed and adds less value once you've already committed to a repository port. For a small todo app wanting SQL control and fast serverless cold starts, Drizzle is the right call.
- **Recommendation:** Keep Drizzle. Resolve the `[ASSUMPTION]` by pinning a concrete 0.4x version at scaffold. Drizzle Kit is the natural migration tool (the spine already defers that detail appropriately).

### Vitest — committed `4.x` ✅ CONFIRMED
- Vitest 4.0 shipped stable; current is **4.1.x** (4.1.9, ~June 2026). Supports Vite 8 and test tags.
- **Fit:** Correct for unit/integration (repository against a real test Postgres, route handlers, rotation selector, Zod validation). No change. Pin latest 4.1.x.

### Playwright + axe-core — committed `latest stable` ✅ CONFIRMED
- Playwright + **`@axe-core/playwright`** is the lowest-friction, standard 2026 stack for automated a11y audits; applies **WCAG 2.2 AA** rules — exactly matching AD-10's target.
- **Fit:** Correct for the ≥5 E2E flows and axe assertions in AD-13. Worth noting (not a spine defect): automated axe catches only ~30-40% of WCAG issues, so the "zero critical violations" target in AD-10 is a floor, not full a11y coverage. Fine as stated.

### TypeScript (strict) — committed `latest stable` ✅ CONFIRMED
- Standard, correct. No concern.

### Docker + Docker Compose — committed `current` ✅ CONFIRMED
- Standard, correct. Multi-stage Dockerfile + `docker compose` (V2, the `app` + `db` topology in AD-12) is current and appropriate. No concern.

---

## Corrected Stack table (proposed)

| Name | Committed | Corrected target |
| --- | --- | --- |
| TypeScript (strict) | latest stable | ✅ latest stable |
| Next.js (App Router) + React | 16.x | ✅ 16.x (pin 16.2/16.3.x) |
| Node.js runtime | 22 LTS | ⚠️ **24 LTS** |
| PostgreSQL | 17.x | ⚠️ **18.x** (17.x acceptable) |
| Drizzle ORM | latest stable `[ASSUMPTION]` | ✅ pin exact 0.4x |
| Vitest | 4.x | ✅ 4.x (pin 4.1.x) |
| Playwright + axe-core | latest stable | ✅ latest stable |
| Docker + Docker Compose | current | ✅ current |

---

## Notes

1. **Node 22 → 24** is the one genuine correction: 22 dropped to Maintenance LTS; 24 is the active LTS for a 2026 greenfield. Non-blocking but should be fixed for accuracy.
2. **Postgres 17 → 18** brings native `uuidv7()`, directly relevant to the UUID-PK schema; 17 is still supported so this is a preference bump, not a fix.
3. **Resolve the two soft version labels at scaffold:** Drizzle's `latest stable [ASSUMPTION]` and any `latest stable` entries must become exact pins — the spine's own version-discipline note (line 110) already mandates this; Drizzle's pre-1.0 status makes it especially important.
4. **Drizzle over Prisma is the correct architectural call** given the repository-port design (AD-2) — no reconsideration warranted.
5. No technology in the stack is outdated, deprecated, mis-named, or a poor fit. All are current and actively maintained as of mid-2026.

## Sources
- [Next.js 16 blog](https://nextjs.org/blog/next-16) · [Next.js current version June 2026](https://abhs.in/blog/nextjs-current-version-march-2026-stable-release-whats-new)
- [Node.js Release WG](https://github.com/nodejs/Release) · [Node 22 vs 24 in 2026](https://www.pkgpulse.com/guides/nodejs-22-vs-nodejs-24-2026) · [Node one-release-per-year](https://www.infoq.com/news/2026/06/nodejs-release-changes/)
- [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/) · [PG 18.4 release](https://www.postgresql.org/about/news/postgresql-184-1710-1614-1518-and-1423-released-3297/) · [PG 18 released](https://www.postgresql.org/about/news/postgresql-18-released-3142/)
- [Drizzle vs Prisma 2026 (Bytebase)](https://www.bytebase.com/blog/drizzle-vs-prisma/) · [Drizzle vs Prisma (Encore)](https://encore.dev/articles/drizzle-vs-prisma)
- [Vitest 4.1 blog](https://vitest.dev/blog/vitest-4-1.html) · [Vitest npm](https://www.npmjs.com/package/vitest)
- [Playwright accessibility testing](https://playwright.dev/docs/accessibility-testing) · [Playwright + axe 2026 guide](https://qaskills.sh/blog/playwright-accessibility-testing-axe-complete-guide)
