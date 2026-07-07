"use client";

import { useState, type FormEvent } from "react";
import { createTodoSchema, updateTodoSchema, type Todo } from "@/lib/todos";
import {
  TodoStoreProvider,
  useTodoStore,
  isPending,
  SORT_OPTIONS,
  type PendingTodo,
} from "@/lib/store";

// The collection state (data + loading/error/empty) lives in the single store
// (AD-14), which now also owns optimistic mutations + rollback (AD-7). This
// component is a consumer. Per-item view state (edit draft, confirm-delete,
// in-flight flags) stays local to each row. Sort (2.3) and the voice pack
// (Epic 3) are later stories.
export default function TodoApp() {
  return (
    <TodoStoreProvider>
      <TodoView />
    </TodoStoreProvider>
  );
}

function TodoView() {
  const store = useTodoStore();
  const { state } = store;
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Single active editor across all rows (avoids duplicate edit inputs).
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Can only add once the list has loaded; guard double-submit re-entry too.
    if (submitting || state.status !== "ready") {
      return;
    }
    setFormError(null);

    // Client-side mirror of the server validation (same shared schema, AD-5).
    const parsed = createTodoSchema.safeParse({ text });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Invalid task.");
      return;
    }

    setSubmitting(true);
    try {
      // Optimistic: the task appears immediately; server reconciles it (AD-7).
      await store.create(parsed.data);
      setText("");
    } catch {
      // Rollback + the plain error are owned by the store (mutationError banner);
      // keep the typed text so the user can retry (FR-10).
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="New task"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What needs doing?"
          disabled={submitting}
        />
        <button type="submit" disabled={submitting || state.status !== "ready"}>
          Add task
        </button>
      </form>

      {formError ? <p role="alert">{formError}</p> : null}

      {/* Mutation failures (create/edit/toggle/delete) surface here so the
          message survives even when the originating row was optimistically
          removed (e.g. a failed delete). Retryable: dismiss and try again. */}
      {store.mutationError ? (
        <div role="alert">
          <p>{store.mutationError}</p>
          <button type="button" onClick={store.dismissMutationError}>
            Dismiss
          </button>
        </div>
      ) : null}

      {state.status === "loading" ? (
        <p>Loading…</p>
      ) : state.status === "error" ? (
        <div role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={store.retry}>
            Retry
          </button>
        </div>
      ) : store.isEmpty ? (
        <p>No tasks yet.</p>
      ) : (
        <>
          <label>
            Sort tasks{" "}
            <select
              aria-label="Sort tasks"
              value={store.sortOrder}
              onChange={(event) => store.setSortOrder(event.target.value as typeof store.sortOrder)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <ul>
            {store.sortedEntries.map((entry) =>
              isPending(entry) ? (
                <PendingRow key={entry.tempId} entry={entry} />
              ) : (
                <TodoItem
                  key={entry.id}
                  todo={entry}
                  // Derived, not synced: if editingId points at a row that has left
                  // the list, no row is "editing" — editingId can never dangle.
                  editing={editingId === entry.id}
                  onStartEdit={() => setEditingId(entry.id)}
                  onStopEdit={() => setEditingId(null)}
                />
              ),
            )}
          </ul>
        </>
      )}
    </section>
  );
}

// An optimistic create not yet confirmed by the server. It has no server id, so
// it is non-mutable (no edit/toggle/delete controls) until it reconciles (FR-11).
function PendingRow({ entry }: { entry: PendingTodo }) {
  return (
    <li aria-busy="true" data-pending="true">
      <input
        type="checkbox"
        checked={false}
        disabled
        readOnly
        aria-label={`Completed: ${entry.text}`}
      />{" "}
      <span>{entry.text}</span> <span>Saving…</span>
    </li>
  );
}

function TodoItem({
  todo,
  editing,
  onStartEdit,
  onStopEdit,
}: {
  todo: Todo;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
}) {
  const store = useTodoStore();
  const [draft, setDraft] = useState(todo.text);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Local, client-side edit validation only. Server/mutation failures are shown
  // by the store's mutationError banner (it survives this row unmounting).
  const [validationError, setValidationError] = useState<string | null>(null);

  async function confirmDelete() {
    if (deleting) {
      return;
    }
    setDeleting(true);
    try {
      // Optimistic: removes this row immediately (component unmounts). On
      // failure the store reinserts it at its original index + shows the banner.
      await store.remove(todo.id);
    } catch {
      // Row reappears via the store's rollback; error shown in the banner.
      setDeleting(false);
    }
  }

  function cancelDelete() {
    setConfirmingDelete(false);
  }

  async function toggleCompleted() {
    if (toggling) {
      return;
    }
    setToggling(true);
    try {
      // Optimistic flip is applied by the store synchronously; the checkbox
      // reflects it instantly. Rollback + error on failure are the store's job.
      await store.update(todo.id, { completed: !todo.completed });
    } catch {
      // Store rolled the flip back and surfaced the error in the banner.
    } finally {
      setToggling(false);
    }
  }

  function startEditing() {
    setDraft(todo.text);
    setValidationError(null);
    onStartEdit();
  }

  function cancelEditing() {
    // Prior text is retained — we never mutated the stored todo.
    setValidationError(null);
    onStopEdit();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }
    setValidationError(null);

    // Client mirror of the server's PATCH validation (same shared schema, AD-5).
    const parsed = updateTodoSchema.safeParse({ text: draft });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid task.");
      return;
    }

    setSaving(true);
    // Optimistic: close the editor now so the list shows the new text
    // immediately (the store already applied it). The row's controls stay
    // disabled (via `saving`) until the server reconciles.
    onStopEdit();
    try {
      await store.update(todo.id, { text: parsed.data.text });
    } catch {
      // Store rolled the text back + surfaced the error; reopen the editor. The
      // `draft` state still holds the typed value, so the user can retry (FR-10).
      onStartEdit();
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save}>
          <input
            aria-label="Edit task"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={saving}
          />
          <button type="submit" disabled={saving}>
            Save
          </button>
          <button type="button" onClick={cancelEditing} disabled={saving}>
            Cancel
          </button>
        </form>
        {validationError ? <span role="alert">{validationError}</span> : null}
      </li>
    );
  }

  return (
    <li data-completed={todo.completed}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={toggleCompleted}
        disabled={toggling || confirmingDelete || saving}
        aria-label={`Completed: ${todo.text}`}
      />{" "}
      {/* Rendered as plain text — React escapes it (AD-11). Completed styling
          comes from CSS (AD-10), not stored strings. */}
      <span className={todo.completed ? "todo-done" : undefined}>
        {todo.text}
      </span>{" "}
      <time dateTime={todo.createdAt}>
        {new Date(todo.createdAt).toLocaleString()}
      </time>{" "}
      <button
        type="button"
        onClick={startEditing}
        disabled={toggling || confirmingDelete || saving}
      >
        Edit
      </button>{" "}
      {confirmingDelete ? (
        <span role="group" aria-label={`Confirm deleting: ${todo.text}`}>
          Delete this task?{" "}
          <button
            type="button"
            onClick={confirmDelete}
            disabled={deleting}
            aria-label={`Confirm delete: ${todo.text}`}
          >
            Confirm
          </button>{" "}
          <button
            type="button"
            onClick={cancelDelete}
            disabled={deleting}
            aria-label={`Cancel delete: ${todo.text}`}
            autoFocus
          >
            Cancel
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          disabled={toggling || saving}
          aria-label={`Delete: ${todo.text}`}
        >
          Delete
        </button>
      )}
    </li>
  );
}
