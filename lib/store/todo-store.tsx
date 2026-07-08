"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ErrorCode } from "@/lib/http";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@/lib/todos";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
  TodoApiError,
} from "@/lib/todos-client";
import { DEFAULT_SORT, sortEntries, type SortOrder } from "./sort";

/** Client-side error code carried to the UI (voiced there, AD-8). `"UNKNOWN"`
 *  is the client wrapper's fallback for timeouts/network/unexpected errors. */
export type ClientErrorCode = ErrorCode | "UNKNOWN";

// AD-14 single client-side owner of the todo collection + its loading/error
// state, and (Story 2.2) the optimistic-mutation + rollback paradigm (AD-7).
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

const savedWithId = (entry: TodoEntry, id: string): boolean =>
  !isPending(entry) && entry.id === id;

/** Stable identity of an entry: server `id` for saved, `tempId` for pending. */
const keyOf = (entry: TodoEntry): string =>
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

/** The API error code, or "UNKNOWN" for non-API/unexpected errors. The UI
 *  voices it (AD-8); raw messages are never shown to the user. */
function codeOf(err: unknown): ClientErrorCode {
  return err instanceof TodoApiError ? err.code : "UNKNOWN";
}

export interface TodoStore {
  state: TodoState;
  /** True only when loaded with no entries. */
  isEmpty: boolean;
  /** Last mutation (create/update/delete) failure code, or null. Survives the
   *  optimistic removal of the row that triggered it (e.g. a failed delete).
   *  The UI maps it to voiced copy (AD-8). */
  mutationErrorCode: ClientErrorCode | null;
  dismissMutationError: () => void;
  /** Client-owned sort selection (FR-8) and the derived, ordered view of the
   *  entries. `state.entries` stays canonical (creation-order); sorting is
   *  purely presentational and issues no network request. */
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  sortedEntries: TodoEntry[];
  retry: () => void;
  create: (input: CreateTodoInput) => Promise<void>;
  update: (id: string, input: UpdateTodoInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const TodoStoreContext = createContext<TodoStore | null>(null);

export function TodoStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(todoReducer, initialState);
  // Mutation errors live outside the reducer: they must persist even after the
  // originating row is optimistically removed, and never change the list status.
  const [mutationErrorCode, setMutationErrorCode] =
    useState<ClientErrorCode | null>(null);
  // Sort selection is presentational — like mutationError it lives outside the
  // reducer so it never perturbs the load/optimistic state machine.
  const [sortOrder, setSortOrder] = useState<SortOrder>(DEFAULT_SORT);
  const mountedRef = useRef(true);
  // Only the most-recent load may dispatch (guards stale/duplicate responses).
  const loadIdRef = useRef(0);

  function load() {
    const loadId = ++loadIdRef.current;
    dispatch({ type: "load/start" });
    fetchTodos()
      .then((todos) => {
        if (mountedRef.current && loadIdRef.current === loadId) {
          dispatch({ type: "load/success", todos });
        }
      })
      .catch((err: unknown) => {
        if (mountedRef.current && loadIdRef.current === loadId) {
          dispatch({ type: "load/error", code: codeOf(err) });
        }
      });
  }

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function safeDispatch(action: TodoAction) {
    if (mountedRef.current) dispatch(action);
  }

  function reportError(err: unknown) {
    if (mountedRef.current) setMutationErrorCode(codeOf(err));
  }

  // Finds the saved todo (and index) for a mutation; null for pending/missing
  // — a task without a server id is non-mutable until its create resolves (FR-11).
  function findSaved(id: string): { todo: Todo; index: number } | null {
    if (state.status !== "ready") return null;
    const index = state.entries.findIndex((e) => savedWithId(e, id));
    if (index === -1) return null;
    return { todo: state.entries[index] as Todo, index };
  }

  const store: TodoStore = {
    state,
    isEmpty: state.status === "ready" && state.entries.length === 0,
    mutationErrorCode,
    dismissMutationError: () => setMutationErrorCode(null),
    sortOrder,
    setSortOrder,
    // Derived view only — canonical `state.entries` is left untouched.
    sortedEntries:
      state.status === "ready" ? sortEntries(state.entries, sortOrder) : [],
    retry: load,
    // Optimistic apply → reconcile on success → rollback on failure (AD-7).
    async create(input) {
      setMutationErrorCode(null);
      const tempId = crypto.randomUUID();
      dispatch({ type: "create/optimistic", tempId, text: input.text });
      try {
        const todo = await createTodo(input);
        safeDispatch({ type: "create/commit", tempId, todo });
      } catch (err) {
        safeDispatch({ type: "create/rollback", tempId });
        reportError(err);
        throw err;
      }
    },
    async update(id, input) {
      const found = findSaved(id);
      if (!found) {
        // FR-11: cannot mutate a task that has no server id yet.
        throw new Error("Task is not saved yet.");
      }
      setMutationErrorCode(null);
      dispatch({ type: "update/optimistic", id, patch: input });
      try {
        const todo = await updateTodo(id, input);
        safeDispatch({ type: "update/commit", id, todo });
      } catch (err) {
        safeDispatch({ type: "update/rollback", id, prev: found.todo });
        reportError(err);
        throw err;
      }
    },
    async remove(id) {
      const found = findSaved(id);
      if (!found) {
        throw new Error("Task is not saved yet.");
      }
      setMutationErrorCode(null);
      // Snapshot the ordering before removal so a rollback restores position
      // even if other entries were added/removed while this delete was inflight.
      const order =
        state.status === "ready" ? state.entries.map(keyOf) : [];
      dispatch({ type: "delete/optimistic", id });
      try {
        await deleteTodo(id);
      } catch (err) {
        safeDispatch({ type: "delete/rollback", todo: found.todo, order });
        reportError(err);
        throw err;
      }
    },
  };

  return (
    <TodoStoreContext.Provider value={store}>
      {children}
    </TodoStoreContext.Provider>
  );
}

/** Consume the single todo store. Throws if used outside the provider. */
export function useTodoStore(): TodoStore {
  const store = useContext(TodoStoreContext);
  if (!store) {
    throw new Error("useTodoStore must be used within a TodoStoreProvider");
  }
  return store;
}
