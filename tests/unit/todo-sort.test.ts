import { describe, it, expect } from "vitest";
import { sortEntries, SORT_OPTIONS, DEFAULT_SORT } from "@/lib/store/sort";
import type { Todo } from "@/lib/todos";
import type { PendingTodo, TodoEntry } from "@/lib/store/todo-store";

function todo(id: string, over: Partial<Todo> = {}): Todo {
  return {
    id,
    text: "task",
    completed: false,
    createdAt: "2026-07-06T00:00:00.000Z",
    ...over,
  };
}

function pending(tempId: string, over: Partial<PendingTodo> = {}): PendingTodo {
  return { tempId, text: "pending", completed: false, pending: true, ...over };
}

// Canonical creation-order fixtures (created_at ascending, as the API returns).
const A = todo("A", { text: "banana", createdAt: "2026-01-01T00:00:00.000Z" });
const B = todo("B", { text: "apple", createdAt: "2026-02-01T00:00:00.000Z" });
const C = todo("C", {
  text: "cherry",
  completed: true,
  createdAt: "2026-03-01T00:00:00.000Z",
});
const canonical: TodoEntry[] = [A, B, C];

describe("sort options", () => {
  it("default sort is newest", () => {
    expect(DEFAULT_SORT).toBe("newest");
  });

  it("exposes exactly the four FR-8 options", () => {
    expect(SORT_OPTIONS.map((o) => o.value)).toEqual([
      "newest",
      "oldest",
      "alphabetical",
      "active-first",
    ]);
  });
});

describe("sortEntries", () => {
  it("newest: by createdAt descending", () => {
    expect(sortEntries(canonical, "newest")).toEqual([C, B, A]);
  });

  it("oldest: by createdAt ascending", () => {
    // Input is deliberately NOT already-ascending, so this fails if the sort
    // were a no-op / identity.
    expect(sortEntries([C, A, B], "oldest")).toEqual([A, B, C]);
  });

  it("alphabetical: case-insensitive by text", () => {
    const withCase = [
      todo("1", { text: "Banana", createdAt: "2026-01-01T00:00:00.000Z" }),
      todo("2", { text: "apple", createdAt: "2026-02-01T00:00:00.000Z" }),
      todo("3", { text: "Cherry", createdAt: "2026-03-01T00:00:00.000Z" }),
    ];
    expect(sortEntries(withCase, "alphabetical").map((e) => e.text)).toEqual([
      "apple",
      "Banana",
      "Cherry",
    ]);
  });

  it("alphabetical: ties break newest-first", () => {
    const older = todo("o", { text: "same", createdAt: "2026-01-01T00:00:00.000Z" });
    const newer = todo("n", { text: "same", createdAt: "2026-02-01T00:00:00.000Z" });
    expect(sortEntries([older, newer], "alphabetical")).toEqual([newer, older]);
  });

  it("active-first: active before completed, newest within each group", () => {
    // active: A(jan), B(feb); completed: C(mar). Within active, newest → B,A.
    expect(sortEntries(canonical, "active-first")).toEqual([B, A, C]);
  });

  it("newest: a pending (optimistic) entry sorts to the top", () => {
    const p = pending("t1", { text: "zzz" });
    expect(sortEntries([A, B, C, p], "newest")).toEqual([p, C, B, A]);
  });

  it("oldest: a pending entry sorts to the bottom", () => {
    const p = pending("t1", { text: "zzz" });
    expect(sortEntries([A, B, C, p], "oldest")).toEqual([A, B, C, p]);
  });

  it("active-first: a pending entry joins the active group at the top", () => {
    const p = pending("t1", { text: "zzz" });
    // active: p(newest), B(feb), A(jan); completed: C.
    expect(sortEntries([A, B, C, p], "active-first")).toEqual([p, B, A, C]);
  });

  it("alphabetical: a pending entry sorts by its text like any other", () => {
    const p = pending("t1", { text: "mango" });
    // apple(B), banana(A), mango(p) — C is "cherry" so before mango.
    expect(sortEntries([A, B, C, p], "alphabetical")).toEqual([B, A, C, p]);
  });

  it("keeps canonical order for equal keys (stable)", () => {
    const x = todo("x", { createdAt: "2026-05-01T00:00:00.000Z" });
    const y = todo("y", { createdAt: "2026-05-01T00:00:00.000Z" });
    expect(sortEntries([x, y], "newest")).toEqual([x, y]);
    const p1 = pending("p1");
    const p2 = pending("p2");
    expect(sortEntries([p1, p2], "newest")).toEqual([p1, p2]);
  });

  it("does not mutate the input array", () => {
    const input = [A, B, C];
    const snapshot = [...input];
    const result = sortEntries(input, "newest");
    expect(input).toEqual(snapshot); // original order preserved
    expect(result).not.toBe(input); // new array returned
  });

  it("handles an empty list", () => {
    expect(sortEntries([], "alphabetical")).toEqual([]);
  });
});
