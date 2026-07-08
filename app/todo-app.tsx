"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  createTodoSchema,
  updateTodoSchema,
  MAX_TEXT_CODE_POINTS,
  type Todo,
} from "@/lib/todos";
import {
  TodoStoreProvider,
  useTodoStore,
  isPending,
  SORT_OPTIONS,
  type PendingTodo,
  type ClientErrorCode,
  type SortOrder,
} from "@/lib/store";
import {
  VoiceProvider,
  useVoice,
  ERROR_CODE_COPY,
  FIXED_COPY,
  type VoiceKey,
} from "@/lib/voice";

// Every user-facing string comes from the voice pack (FR-14): action controls
// re-roll on activation, transient surfaces pick fresh on each appearance
// (FR-16). State/selection-conveying text (completion, sort) stays plain +
// unrotated (FR-17). ALL-CAPS is CSS (`.voice`), not stored (FR-20). Error
// codes are voiced client-side (AD-8). E2E locate controls via data-testid so
// rotating copy can't break them.
export default function TodoApp() {
  return (
    <VoiceProvider>
      <AppTitle />
      <TodoStoreProvider>
        <TodoView />
      </TodoStoreProvider>
    </VoiceProvider>
  );
}

// The app title/heading — a rendered surface, so it's voiced too (FR-14). Each
// variant keeps the "BeMad" brand; ALL-CAPS is CSS (FR-20).
function AppTitle() {
  const { text } = useVoice("appTitle");
  return (
    <h1 className="voice" data-testid="app-title">
      {text}
    </h1>
  );
}

/** A voiced message line, mounted on demand so it picks a fresh variant each
 *  appearance (FR-16). */
function VoicedMessage({
  voiceKey,
  testId,
  alert = false,
}: {
  voiceKey: VoiceKey;
  testId: string;
  alert?: boolean;
}) {
  const { text } = useVoice(voiceKey);
  return (
    <p className="voice" data-testid={testId} role={alert ? "alert" : undefined}>
      {text}
    </p>
  );
}

function TodoView() {
  const store = useTodoStore();
  const { state } = store;
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrorKey, setFormErrorKey] = useState<VoiceKey | null>(null);
  // Single active editor across all rows (avoids duplicate edit inputs).
  const [editingId, setEditingId] = useState<string | null>(null);

  const addButton = useVoice("addButton");
  const placeholder = useVoice("addPlaceholder");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || state.status !== "ready") {
      return;
    }
    setFormErrorKey(null);

    // Client-side mirror of the server validation (same shared schema, AD-5).
    const parsed = createTodoSchema.safeParse({ text });
    if (!parsed.success) {
      // Voiced validation copy (FR-9): pick the key by which rule failed.
      const tooLong = [...text.trim()].length > MAX_TEXT_CODE_POINTS;
      setFormErrorKey(tooLong ? "validationTooLong" : "validationEmpty");
      return;
    }

    addButton.reroll(); // re-roll the label on activation (FR-16)
    setSubmitting(true);
    try {
      await store.create(parsed.data);
      setText("");
    } catch {
      // Rollback + the voiced error are owned by the store's mutation banner;
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
          placeholder={placeholder.text}
          disabled={submitting}
        />
        <button
          type="submit"
          className="voice"
          data-testid="add-task"
          aria-label="Add task"
          disabled={submitting || state.status !== "ready"}
        >
          {addButton.text}
        </button>
      </form>

      {formErrorKey ? (
        <VoicedMessage voiceKey={formErrorKey} testId="form-error" alert />
      ) : null}

      {/* Mutation failures surface here (voiced from the error code) so the
          message survives even when the originating row was optimistically
          removed (e.g. a failed delete). */}
      {store.mutationErrorCode ? (
        <MutationBanner
          code={store.mutationErrorCode}
          onDismiss={store.dismissMutationError}
        />
      ) : null}

      {state.status === "loading" ? (
        <VoicedMessage voiceKey="loadingState" testId="loading" />
      ) : state.status === "error" ? (
        <LoadError code={state.code} onRetry={store.retry} />
      ) : store.isEmpty ? (
        <VoicedMessage voiceKey="emptyState" testId="empty-state" />
      ) : (
        <>
          <SortControl value={store.sortOrder} onChange={store.setSortOrder} />
          <ul>
            {store.sortedEntries.map((entry) =>
              isPending(entry) ? (
                <PendingRow key={entry.tempId} entry={entry} />
              ) : (
                <TodoItem
                  key={entry.id}
                  todo={entry}
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

// Sort is selection-conveying → FIXED voiced copy, never rotated (FR-17). The
// visible label IS the accessible name (WCAG 2.5.3); E2E use data-testid.
function SortControl({
  value,
  onChange,
}: {
  value: SortOrder;
  onChange: (order: SortOrder) => void;
}) {
  return (
    <label>
      <span className="voice">{FIXED_COPY.sortLabel}</span>{" "}
      <select
        data-testid="sort"
        value={value}
        onChange={(event) => onChange(event.target.value as SortOrder)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {FIXED_COPY[option.value]}
          </option>
        ))}
      </select>
    </label>
  );
}

function LoadError({
  code,
  onRetry,
}: {
  code: ClientErrorCode;
  onRetry: () => void;
}) {
  const message = useVoice(ERROR_CODE_COPY[code]);
  const retry = useVoice("retryButton");
  return (
    <div role="alert" data-testid="load-error">
      <p className="voice">{message.text}</p>
      <button
        type="button"
        className="voice"
        data-testid="retry"
        aria-label="Retry loading tasks"
        onClick={() => {
          retry.reroll();
          onRetry();
        }}
      >
        {retry.text}
      </button>
    </div>
  );
}

function MutationBanner({
  code,
  onDismiss,
}: {
  code: ClientErrorCode;
  onDismiss: () => void;
}) {
  const message = useVoice(ERROR_CODE_COPY[code]);
  const dismiss = useVoice("dismissButton");
  return (
    <div role="alert" data-testid="mutation-error">
      <p className="voice">{message.text}</p>
      <button
        type="button"
        className="voice"
        data-testid="dismiss"
        aria-label="Dismiss error"
        onClick={() => {
          dismiss.reroll();
          onDismiss();
        }}
      >
        {dismiss.text}
      </button>
    </div>
  );
}

// An optimistic create not yet confirmed by the server. Non-mutable until it
// reconciles (FR-11).
function PendingRow({ entry }: { entry: PendingTodo }) {
  const saving = useVoice("savingPending");
  return (
    <li aria-busy="true" data-pending="true">
      <input
        type="checkbox"
        checked={false}
        disabled
        readOnly
        aria-label={`Completed: ${entry.text}`}
      />{" "}
      <span className="todo-text">{entry.text}</span>{" "}
      <span className="voice" data-testid="saving">
        {saving.text}
      </span>
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
  const [validationErrorKey, setValidationErrorKey] = useState<VoiceKey | null>(
    null,
  );

  const editButton = useVoice("editButton");
  const deleteButton = useVoice("deleteButton");

  // Focus management: when the delete-confirm closes via Cancel, return focus to
  // the Delete trigger (WCAG 2.4.3; Epic 1 retro item). On confirm-success the
  // row unmounts, so this only fires for the cancel/reopen path.
  const deleteRef = useRef<HTMLButtonElement>(null);
  const wasConfirming = useRef(false);
  useEffect(() => {
    if (wasConfirming.current && !confirmingDelete) {
      deleteRef.current?.focus();
    }
    wasConfirming.current = confirmingDelete;
  }, [confirmingDelete]);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await store.remove(todo.id);
    } catch {
      setDeleting(false);
    }
  }

  async function toggleCompleted() {
    if (toggling) return;
    setToggling(true);
    try {
      await store.update(todo.id, { completed: !todo.completed });
    } catch {
      // Store rolled back + surfaced the voiced error in the banner.
    } finally {
      setToggling(false);
    }
  }

  function startEditing() {
    setDraft(todo.text);
    setValidationErrorKey(null);
    onStartEdit();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setValidationErrorKey(null);

    const parsed = updateTodoSchema.safeParse({ text: draft });
    if (!parsed.success) {
      const tooLong = [...draft.trim()].length > MAX_TEXT_CODE_POINTS;
      setValidationErrorKey(tooLong ? "validationTooLong" : "validationEmpty");
      return;
    }

    setSaving(true);
    onStopEdit(); // optimistic: close now; the list shows the new text
    try {
      await store.update(todo.id, { text: parsed.data.text });
    } catch {
      onStartEdit(); // reopen with the retained draft on failure (FR-10)
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <EditRow
        draft={draft}
        setDraft={setDraft}
        saving={saving}
        onSave={save}
        onCancel={() => {
          setValidationErrorKey(null);
          onStopEdit();
        }}
        validationErrorKey={validationErrorKey}
      />
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
      {/* Task text is user data — rendered escaped (AD-11), never voiced. */}
      <span className={todo.completed ? "todo-text todo-done" : "todo-text"}>
        {todo.text}
      </span>{" "}
      <time dateTime={todo.createdAt}>
        {new Date(todo.createdAt).toLocaleString()}
      </time>{" "}
      <button
        type="button"
        className="voice"
        data-testid="edit"
        aria-label={`Edit task: ${todo.text}`}
        onClick={() => {
          editButton.reroll();
          startEditing();
        }}
        disabled={toggling || confirmingDelete || saving}
      >
        {editButton.text}
      </button>{" "}
      {confirmingDelete ? (
        <DeleteConfirm
          taskText={todo.text}
          deleting={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : (
        <button
          ref={deleteRef}
          type="button"
          className="voice"
          data-testid="delete"
          aria-label={`Delete task: ${todo.text}`}
          onClick={() => {
            deleteButton.reroll();
            setConfirmingDelete(true);
          }}
          disabled={toggling || saving}
        >
          {deleteButton.text}
        </button>
      )}
    </li>
  );
}

// Mounted only while editing → Save/Cancel pick fresh each time editing opens.
function EditRow({
  draft,
  setDraft,
  saving,
  onSave,
  onCancel,
  validationErrorKey,
}: {
  draft: string;
  setDraft: (value: string) => void;
  saving: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  validationErrorKey: VoiceKey | null;
}) {
  const saveButton = useVoice("saveButton");
  const cancelButton = useVoice("editCancelButton");
  return (
    <li>
      <form onSubmit={onSave}>
        <input
          aria-label="Edit task"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={saving}
        />
        <button
          type="submit"
          className="voice"
          data-testid="save"
          aria-label="Save task"
          onClick={() => saveButton.reroll()}
          disabled={saving}
        >
          {saveButton.text}
        </button>
        <button
          type="button"
          className="voice"
          data-testid="cancel-edit"
          aria-label="Cancel editing"
          onClick={() => {
            cancelButton.reroll();
            onCancel();
          }}
          disabled={saving}
        >
          {cancelButton.text}
        </button>
      </form>
      {validationErrorKey ? (
        <VoicedMessage voiceKey={validationErrorKey} testId="edit-error" alert />
      ) : null}
    </li>
  );
}

// Mounted only while confirming → prompt + confirm/cancel pick fresh each open.
function DeleteConfirm({
  taskText,
  deleting,
  onConfirm,
  onCancel,
}: {
  taskText: string;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const prompt = useVoice("deleteConfirmPrompt");
  const confirm = useVoice("deleteConfirmButton");
  const cancel = useVoice("deleteCancelButton");
  return (
    <span role="group" aria-label={`Confirm deleting: ${taskText}`}>
      <span className="voice">{prompt.text}</span>{" "}
      <button
        type="button"
        className="voice"
        data-testid="confirm-delete"
        aria-label={`Confirm delete: ${taskText}`}
        onClick={() => {
          confirm.reroll();
          onConfirm();
        }}
        disabled={deleting}
      >
        {confirm.text}
      </button>{" "}
      {/* Quiet-aside beat: intentionally lowercase, so NOT uppercased. */}
      <button
        type="button"
        className="voice-quiet"
        data-testid="cancel-delete"
        aria-label="Cancel delete"
        onClick={() => {
          cancel.reroll();
          onCancel();
        }}
        disabled={deleting}
        autoFocus
      >
        {cancel.text}
      </button>
    </span>
  );
}
