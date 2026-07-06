import type { InferSelectModel } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// The todos table. camelCase TS property names map to snake_case columns via
// explicit column-name strings — this file (inside lib/db) is the sole
// snake_case↔camelCase mapping boundary (AD-5). No `updated_at` by design
// (FR-7 needs creation time only). Room is intentionally left for a future
// `owner` column (NFR-6) without adding it now.
export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  text: text("text").notNull(),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type TodoRow = InferSelectModel<typeof todos>;
