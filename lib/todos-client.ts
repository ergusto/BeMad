import type { ErrorCode } from "@/lib/http";
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@/lib/todos";

// Thin fetch wrapper for the todos API. NOT the client state store — AD-14's
// single state owner is Story 2.1's job and will consume these functions.

/** Error thrown by the client wrapper, carrying the API's error code. */
export class TodoApiError extends Error {
  constructor(
    public readonly code: ErrorCode | "UNKNOWN",
    message: string,
  ) {
    super(message);
    this.name = "TodoApiError";
  }
}

async function toApiError(res: Response): Promise<TodoApiError> {
  try {
    const body = (await res.json()) as {
      error?: { code?: ErrorCode; message?: string };
    };
    return new TodoApiError(
      body.error?.code ?? "UNKNOWN",
      body.error?.message ?? "Something went wrong.",
    );
  } catch {
    return new TodoApiError("UNKNOWN", "Something went wrong.");
  }
}

/** Parses a successful JSON body, or throws a TodoApiError on a malformed body. */
async function parseJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new TodoApiError("UNKNOWN", "The server returned an invalid response.");
  }
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch("/api/todos");
  if (!res.ok) {
    throw await toApiError(res);
  }
  return parseJson<Todo[]>(res);
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return parseJson<Todo>(res);
}

export async function updateTodo(
  id: string,
  input: UpdateTodoInput,
): Promise<Todo> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  return parseJson<Todo>(res);
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch(`/api/todos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw await toApiError(res);
  }
  // 204 No Content — nothing to parse.
}
