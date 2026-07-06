"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createTodoSchema, updateTodoSchema, type Todo } from "@/lib/todos";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
} from "@/lib/todos-client";

// Minimal create + view + inline-edit UI. The single client state store, full
// empty/loading/error states, optimistic updates, sort, and the voice pack are
// LATER stories (2.1, 2.2, 2.3, Epic 3). Copy is plain for now.
export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Single active editor across all rows (avoids duplicate edit inputs).
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTodos()
      .then((loaded) => {
        if (active) setTodos(loaded);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load tasks.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Guard against submitting before the initial load resolves (which would let
    // the late fetch clobber the new todo) and against double-submit re-entry.
    if (loading || submitting) {
      return;
    }
    setError(null);

    // Client-side mirror of the server validation (same shared schema, AD-5).
    const parsed = createTodoSchema.safeParse({ text });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid task.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createTodo(parsed.data);
      setTodos((prev) => [...prev, created]);
      setText("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleUpdated(updated: Todo) {
    setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleDeleted(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) {
      setEditingId(null);
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
        <button type="submit" disabled={submitting || loading}>
          Add task
        </button>
      </form>

      {error ? <p role="alert">{error}</p> : null}

      {loading ? (
        <p>Loading…</p>
      ) : todos.length > 0 ? (
        <ul>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              editing={editingId === todo.id}
              onStartEdit={() => setEditingId(todo.id)}
              onStopEdit={() => setEditingId(null)}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>
      ) : error ? null : (
        <p>No tasks yet.</p>
      )}
    </section>
  );
}

function TodoItem({
  todo,
  editing,
  onStartEdit,
  onStopEdit,
  onUpdated,
  onDeleted,
}: {
  todo: Todo;
  editing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onUpdated: (updated: Todo) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState(todo.text);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (deleting) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      await deleteTodo(todo.id);
      onDeleted(todo.id); // removes this row (component unmounts)
    } catch (err: unknown) {
      // Keep the task; surface the plain error (no optimistic removal — 2.2).
      setError(err instanceof Error ? err.message : "Failed to delete task.");
      setDeleting(false);
    }
  }

  function startConfirmingDelete() {
    // Clear any stale toggle/edit error so it doesn't render beside the prompt.
    setError(null);
    setConfirmingDelete(true);
  }

  function cancelDelete() {
    setConfirmingDelete(false);
    setError(null);
  }

  async function toggleCompleted() {
    if (toggling) {
      return;
    }
    setError(null);
    setToggling(true);
    try {
      // Await the server, then apply the returned todo (no optimistic flip —
      // that's Story 2.2). Bi-directional via `!todo.completed`.
      const updated = await updateTodo(todo.id, {
        completed: !todo.completed,
      });
      onUpdated(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update task.");
    } finally {
      setToggling(false);
    }
  }

  function startEditing() {
    setDraft(todo.text);
    setError(null);
    onStartEdit();
  }

  function cancelEditing() {
    // Prior text is retained — we never mutated the stored todo (AC #2).
    setError(null);
    onStopEdit();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }
    setError(null);

    // Client mirror of the server's PATCH validation (same shared schema, AD-5).
    const parsed = updateTodoSchema.safeParse({ text: draft });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid task.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateTodo(todo.id, { text: parsed.data.text });
      onUpdated(updated);
      onStopEdit();
    } catch (err: unknown) {
      // Prior text retained; surface the plain error (AC #2).
      setError(err instanceof Error ? err.message : "Failed to save task.");
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
        {error ? <span role="alert">{error}</span> : null}
      </li>
    );
  }

  return (
    <li data-completed={todo.completed}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={toggleCompleted}
        disabled={toggling || confirmingDelete}
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
        disabled={toggling || confirmingDelete}
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
          onClick={startConfirmingDelete}
          disabled={toggling}
          aria-label={`Delete: ${todo.text}`}
        >
          Delete
        </button>
      )}
      {error ? <span role="alert">{error}</span> : null}
    </li>
  );
}
