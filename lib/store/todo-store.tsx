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
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@/lib/todos";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
  TodoApiError,
} from "@/lib/todos-client";
import { DEFAULT_SORT, sortEntries, type SortOrder } from "./sort";
import {
  initialState,
  keyOf,
  savedWithId,
  todoReducer,
  type ClientErrorCode,
  type TodoAction,
  type TodoEntry,
  type TodoState,
} from "./reducer";

// AD-14 single client-side owner of the todo collection + its loading/error
// state, and (Story 2.2) the optimistic-mutation + rollback paradigm (AD-7).
// The pure state machine (reducer, types, helpers) lives in ./reducer (a `.ts`
// module — node-unit-testable and counted by the coverage gate); this file is
// the `"use client"` React provider that drives it and re-exports that surface
// so existing `@/lib/store/todo-store` imports keep resolving.
export * from "./reducer";

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
