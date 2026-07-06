import { defineConfig } from "drizzle-kit";

// Migration tooling config. The `todos` table + schema land in Story 1.2;
// this config is scaffolded now so `db:generate`/`db:migrate` work once the
// schema in ./lib/db/schema.ts is populated.
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set — required for drizzle-kit (see .env.example)",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
