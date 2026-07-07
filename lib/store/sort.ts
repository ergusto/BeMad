import type { Todo } from "@/lib/todos";
import type { PendingTodo, TodoEntry } from "./todo-store";

// Client-owned, purely-presentational sort (FR-8). The API returns
// creation-order and the store keeps `entries` canonical; this module only
// derives a re-ordered *view* — it never mutates the input array (so Story 2.2's
// optimistic reconcile/rollback, which reason over canonical order, stay intact).

export type SortOrder = "newest" | "oldest" | "alphabetical" | "active-first";

export const DEFAULT_SORT: SortOrder = "newest";

// Plain labels (AD-8); the Torgue voice (Epic 3) can remap these later.
export const SORT_OPTIONS: ReadonlyArray<{ value: SortOrder; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "active-first", label: "Active first" },
];

// Type-only import above erases at runtime, so there's no import cycle with the
// store; this runtime guard mirrors the store's isPending.
const isPendingEntry = (entry: TodoEntry): entry is PendingTodo =>
  (entry as PendingTodo).pending === true;

// A pending (optimistic) create has no createdAt — treat it as the newest.
const timeKey = (entry: TodoEntry): number =>
  isPendingEntry(entry)
    ? Number.POSITIVE_INFINITY
    : Date.parse((entry as Todo).createdAt);

// Newest-first by time. Guards Infinity − Infinity (→ NaN) to 0 so multiple
// pending entries keep their canonical order (stable sort).
const cmpNewest = (a: TodoEntry, b: TodoEntry): number => {
  const d = timeKey(b) - timeKey(a);
  return Number.isNaN(d) ? 0 : d;
};

/** Returns a NEW array ordered per `order`; never mutates `entries`. */
export function sortEntries(entries: TodoEntry[], order: SortOrder): TodoEntry[] {
  const copy = [...entries];
  switch (order) {
    case "newest":
      copy.sort(cmpNewest);
      break;
    case "oldest":
      copy.sort((a, b) => -cmpNewest(a, b));
      break;
    case "alphabetical":
      copy.sort((a, b) => {
        // Pinned locale for deterministic ordering across server/client/CI.
        // `sensitivity: "base"` folds case and accents (a = á = A).
        const byText = a.text.localeCompare(b.text, "en", {
          sensitivity: "base",
        });
        return byText !== 0 ? byText : cmpNewest(a, b);
      });
      break;
    case "active-first":
      copy.sort((a, b) => {
        // active (completed === false → 0) before completed (→ 1)
        const byGroup = Number(a.completed) - Number(b.completed);
        return byGroup !== 0 ? byGroup : cmpNewest(a, b);
      });
      break;
  }
  return copy;
}
