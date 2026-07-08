import type { ErrorCode } from "@/lib/http";
import type { Todo, UpdateTodoInput } from "@/lib/todos";

// Pure, framework-free core of the client store (AD-14): the collection state
// machine + optimistic-mutation transitions (AD-7). Kept in a `.ts` module (not
// the `"use client"` provider) so it is node-unit-testable AND counted by the
// Vitest coverage gate (Story 4.2). The React provider in ./todo-store.tsx
// consumes this and re-exports the public surface.

/** Client-side error code carried to the UI (voiced there, AD-8). `"UNKNOWN"`
 *  is the client wrapper's fallback for timeouts/network/unexpected errors. */
export type ClientErrorCode = ErrorCode | "UNKNOWN";

// A collection entry is either a saved Todo (server id) or a pending create
// (client tempId, no server id). A tempId NEVER occupies the id field (AD-7).

/** An optimistic create not yet confirmed by the server. */
export interface PendingTodo {
  tempId: string;
  text: string;
  completed: boolean;
  pending: true;
}

export type TodoEntry = Todo | PendingTodo;

export function isPending(entry: TodoEntry): entry is PendingTodo {
  return (entry as PendingTodo).pending === true;
}

export type TodoState =
  | { status: "loading" }
  | { status: "ready"; entries: TodoEntry[] }
  // Carries the error CODE (not a raw message); the UI maps it to voiced copy
  // client-side (AD-8, Story 3.3).
  | { status: "error"; code: ClientErrorCode };

export type TodoAction =
  | { type: "load/start" }
  | { type: "load/success"; todos: Todo[] }
  | { type: "load/error"; code: ClientErrorCode }
  // optimistic create → commit (reconcile) | rollback
  | { type: "create/optimistic"; tempId: string; text: string }
  | { type: "create/commit"; tempId: string; todo: Todo }
  | { type: "create/rollback"; tempId: string }
  // optimistic update → commit | rollback
  | { type: "update/optimistic"; id: string; patch: UpdateTodoInput }
  | { type: "update/commit"; id: string; todo: Todo }
  | { type: "update/rollback"; id: string; prev: Todo }
  // optimistic delete → rollback (commit is a no-op; already removed)
  | { type: "delete/optimistic"; id: string }
  // `order` is the snapshot of entry keys taken before the optimistic removal;
  // rollback reinserts the todo AND restores that ordering, so interleaved
  // deletes/creates can't corrupt position (an absolute index would go stale).
  | { type: "delete/rollback"; todo: Todo; order: string[] };

export const initialState: TodoState = { status: "loading" };

export const savedWithId = (entry: TodoEntry, id: string): boolean =>
  !isPending(entry) && entry.id === id;

/** Stable identity of an entry: server `id` for saved, `tempId` for pending. */
export const keyOf = (entry: TodoEntry): string =>
  isPending(entry) ? entry.tempId : entry.id;

/** Pure reducer — the collection state machine + optimistic transitions. */
export function todoReducer(state: TodoState, action: TodoAction): TodoState {
  switch (action.type) {
    case "load/start":
      return { status: "loading" };
    case "load/success":
      return { status: "ready", entries: action.todos };
    case "load/error":
      return { status: "error", code: action.code };
  }

  // All mutation transitions require a ready list; otherwise no-op.
  if (state.status !== "ready") {
    return state;
  }
  const { entries } = state;

  switch (action.type) {
    case "create/optimistic":
      return {
        status: "ready",
        entries: [
          ...entries,
          {
            tempId: action.tempId,
            text: action.text,
            completed: false,
            pending: true,
          },
        ],
      };
    case "create/commit":
      return {
        status: "ready",
        entries: entries.map((e) =>
          isPending(e) && e.tempId === action.tempId ? action.todo : e,
        ),
      };
    case "create/rollback":
      return {
        status: "ready",
        entries: entries.filter(
          (e) => !(isPending(e) && e.tempId === action.tempId),
        ),
      };
    case "update/optimistic":
      return {
        status: "ready",
        entries: entries.map((e) =>
          savedWithId(e, action.id) ? { ...(e as Todo), ...action.patch } : e,
        ),
      };
    case "update/commit":
      return {
        status: "ready",
        entries: entries.map((e) =>
          savedWithId(e, action.id) ? action.todo : e,
        ),
      };
    case "update/rollback":
      return {
        status: "ready",
        entries: entries.map((e) =>
          savedWithId(e, action.id) ? action.prev : e,
        ),
      };
    case "delete/optimistic":
      return {
        status: "ready",
        entries: entries.filter((e) => !savedWithId(e, action.id)),
      };
    case "delete/rollback": {
      // Reinsert the todo, then restore the pre-delete ordering. Entries absent
      // from the snapshot (e.g. a create that landed since) sort to the end,
      // preserving their relative order (Array.prototype.sort is stable).
      const restored = [...entries, action.todo];
      const rank = (entry: TodoEntry): number => {
        const i = action.order.indexOf(keyOf(entry));
        return i === -1 ? Number.MAX_SAFE_INTEGER : i;
      };
      restored.sort((a, b) => rank(a) - rank(b));
      return { status: "ready", entries: restored };
    }
    default:
      return state;
  }
}
