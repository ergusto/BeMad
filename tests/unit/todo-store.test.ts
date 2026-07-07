import { describe, it, expect } from "vitest";
import {
  todoReducer,
  initialState,
  isPending,
  type PendingTodo,
  type TodoEntry,
  type TodoState,
} from "@/lib/store/todo-store";
import type { Todo } from "@/lib/todos";

function todo(id: string, over: Partial<Todo> = {}): Todo {
  return {
    id,
    text: "task",
    completed: false,
    createdAt: "2026-07-06T00:00:00.000Z",
    ...over,
  };
}

function pending(tempId: string, text = "task"): PendingTodo {
  return { tempId, text, completed: false, pending: true };
}

const ready = (entries: TodoEntry[]): TodoState => ({
  status: "ready",
  entries,
});

describe("todoReducer — load lifecycle", () => {
  it("initial state is loading", () => {
    expect(initialState).toEqual({ status: "loading" });
  });

  it("load/success with todos → ready (loaded)", () => {
    expect(
      todoReducer(
        { status: "loading" },
        { type: "load/success", todos: [todo("1")] },
      ),
    ).toEqual(ready([todo("1")]));
  });

  it("load/success with [] → ready (empty)", () => {
    expect(
      todoReducer({ status: "loading" }, { type: "load/success", todos: [] }),
    ).toEqual(ready([]));
  });

  it("load/error → error", () => {
    expect(
      todoReducer(
        { status: "loading" },
        { type: "load/error", message: "boom" },
      ),
    ).toEqual({ status: "error", message: "boom" });
  });

  it("load/start (retry) resets to loading from error", () => {
    expect(
      todoReducer({ status: "error", message: "x" }, { type: "load/start" }),
    ).toEqual({ status: "loading" });
  });
});

describe("todoReducer — optimistic create", () => {
  it("create/optimistic appends a pending entry (no server id yet)", () => {
    const next = todoReducer(ready([todo("1")]), {
      type: "create/optimistic",
      tempId: "t1",
      text: "new task",
    });
    expect(next).toEqual(ready([todo("1"), pending("t1", "new task")]));
    // The optimistic entry must be pending — a tempId never occupies an id.
    if (next.status === "ready") {
      const appended = next.entries.at(-1);
      expect(appended && isPending(appended)).toBe(true);
    }
  });

  it("create/commit reconciles the pending entry into the server todo", () => {
    const next = todoReducer(ready([todo("1"), pending("t1", "new task")]), {
      type: "create/commit",
      tempId: "t1",
      todo: todo("server", { text: "new task" }),
    });
    expect(next).toEqual(ready([todo("1"), todo("server", { text: "new task" })]));
  });

  it("create/rollback removes the pending entry, leaving saved todos", () => {
    const next = todoReducer(ready([todo("1"), pending("t1")]), {
      type: "create/rollback",
      tempId: "t1",
    });
    expect(next).toEqual(ready([todo("1")]));
  });

  it("create/commit ignores a non-matching tempId", () => {
    const start = ready([pending("t1")]);
    expect(
      todoReducer(start, {
        type: "create/commit",
        tempId: "other",
        todo: todo("x"),
      }),
    ).toEqual(start);
  });
});

describe("todoReducer — optimistic update", () => {
  it("update/optimistic applies the patch to the saved todo", () => {
    const next = todoReducer(ready([todo("1", { text: "old" })]), {
      type: "update/optimistic",
      id: "1",
      patch: { text: "new" },
    });
    expect(next).toEqual(ready([todo("1", { text: "new" })]));
  });

  it("update/optimistic can flip completion", () => {
    const next = todoReducer(ready([todo("1")]), {
      type: "update/optimistic",
      id: "1",
      patch: { completed: true },
    });
    expect(next).toEqual(ready([todo("1", { completed: true })]));
  });

  it("update/optimistic never matches a pending entry (no id)", () => {
    const start = ready([pending("t1")]);
    expect(
      todoReducer(start, {
        type: "update/optimistic",
        id: "t1",
        patch: { text: "x" },
      }),
    ).toEqual(start);
  });

  it("update/commit replaces the saved todo with the server copy", () => {
    const next = todoReducer(ready([todo("1", { text: "optimistic" })]), {
      type: "update/commit",
      id: "1",
      todo: todo("1", { text: "server", completed: true }),
    });
    expect(next).toEqual(ready([todo("1", { text: "server", completed: true })]));
  });

  it("update/rollback restores the prior todo", () => {
    const prev = todo("1", { text: "before" });
    const next = todoReducer(ready([todo("1", { text: "after" })]), {
      type: "update/rollback",
      id: "1",
      prev,
    });
    expect(next).toEqual(ready([prev]));
  });
});

describe("todoReducer — optimistic delete", () => {
  it("delete/optimistic removes the saved todo by id", () => {
    const next = todoReducer(ready([todo("1"), todo("2")]), {
      type: "delete/optimistic",
      id: "1",
    });
    expect(next).toEqual(ready([todo("2")]));
  });

  it("delete/optimistic leaves pending entries untouched", () => {
    const start = ready([pending("t1"), todo("2")]);
    expect(
      todoReducer(start, { type: "delete/optimistic", id: "t1" }),
    ).toEqual(start);
  });

  it("delete/rollback reinserts the todo at its original position (order snapshot)", () => {
    const next = todoReducer(ready([todo("2"), todo("3")]), {
      type: "delete/rollback",
      todo: todo("1"),
      order: ["1", "2", "3"],
    });
    expect(next).toEqual(ready([todo("1"), todo("2"), todo("3")]));
  });

  it("delete/rollback restores a middle item to its position", () => {
    const next = todoReducer(ready([todo("1"), todo("3")]), {
      type: "delete/rollback",
      todo: todo("2"),
      order: ["1", "2", "3"],
    });
    expect(next).toEqual(ready([todo("1"), todo("2"), todo("3")]));
  });

  it("delete/rollback restores correct order after an interleaved delete removed an earlier sibling", () => {
    // [A,B,C] → optimistic-delete B, then delete A commits → [C]; now B's delete
    // fails and rolls back. An absolute index would yield [C,B]; the order
    // snapshot restores [B,C].
    const next = todoReducer(ready([todo("C")]), {
      type: "delete/rollback",
      todo: todo("B"),
      order: ["A", "B", "C"],
    });
    expect(next).toEqual(ready([todo("B"), todo("C")]));
  });

  it("delete/rollback sorts entries absent from the snapshot to the end", () => {
    // A create landed (tempId "t9") after the delete snapshot was taken.
    const next = todoReducer(ready([todo("2"), pending("t9")]), {
      type: "delete/rollback",
      todo: todo("1"),
      order: ["1", "2"],
    });
    expect(next).toEqual(ready([todo("1"), todo("2"), pending("t9")]));
  });
});

describe("todoReducer — mutation actions are no-ops when not ready", () => {
  const notReady: TodoState[] = [
    { status: "loading" },
    { status: "error", message: "x" },
  ];

  it("create/optimistic is a no-op when not ready", () => {
    for (const state of notReady) {
      expect(
        todoReducer(state, {
          type: "create/optimistic",
          tempId: "t1",
          text: "x",
        }),
      ).toEqual(state);
    }
  });

  it("update/optimistic is a no-op when not ready", () => {
    for (const state of notReady) {
      expect(
        todoReducer(state, {
          type: "update/optimistic",
          id: "1",
          patch: { text: "x" },
        }),
      ).toEqual(state);
    }
  });

  it("delete/optimistic is a no-op when not ready", () => {
    for (const state of notReady) {
      expect(
        todoReducer(state, { type: "delete/optimistic", id: "1" }),
      ).toEqual(state);
    }
  });
});
