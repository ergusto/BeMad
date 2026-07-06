import { asc, eq, sql } from "drizzle-orm";
import type {
  CreateTodoInput,
  Todo,
  UpdateTodoInput,
} from "@/lib/todos";
import type { Database } from "./client";
import { todos, type TodoRow } from "./schema";

// Bound the health query below Docker's 5s HEALTHCHECK timeout so a database
// that accepts the connection but never answers cannot hang the probe.
const HEALTHCHECK_TIMEOUT_MS = 4000;

// A syntactically-invalid id can never match a uuid-typed row. Guard before
// querying so a malformed id resolves to "not found" (null/false) rather than
// throwing a raw Postgres "invalid input syntax for type uuid" error.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`operation timed out after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * The single data-access port for todos (AD-2). All persistence flows through
 * this interface; no other module touches the DB client. The repository is the
 * sole boundary that maps DB rows (snake_case columns, Date timestamps) to the
 * shared domain shape (camelCase, ISO-8601 string) — AD-5.
 */
export interface TodoRepository {
  /** Returns true when the database answers a trivial query, false otherwise. */
  healthcheck(): Promise<boolean>;
  /** Inserts a todo and returns it with its server-generated id + timestamp. */
  create(input: CreateTodoInput): Promise<Todo>;
  /** Returns all todos in creation order (created_at asc). */
  list(): Promise<Todo[]>;
  /** Returns the todo with the given id, or null if none exists. */
  get(id: string): Promise<Todo | null>;
  /** Applies a partial update; returns the updated todo, or null if none exists. */
  update(id: string, input: UpdateTodoInput): Promise<Todo | null>;
  /** Deletes the todo; returns true if a row was removed, false otherwise. */
  delete(id: string): Promise<boolean>;
  /** Releases the underlying connection pool. */
  close(): Promise<void>;
}

export class PostgresTodoRepository implements TodoRepository {
  constructor(
    private readonly db: Database,
    private readonly onClose: () => Promise<void>,
  ) {}

  async healthcheck(): Promise<boolean> {
    const query = this.db.execute(sql`select 1`);
    // Swallow a late rejection if the timeout wins the race, so it never
    // surfaces as an unhandled rejection.
    query.catch(() => {});
    try {
      await withTimeout(query, HEALTHCHECK_TIMEOUT_MS);
      return true;
    } catch {
      return false;
    }
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    const rows = await this.db
      .insert(todos)
      .values({ text: input.text })
      .returning();
    const row = rows[0];
    if (!row) {
      throw new Error("Insert returned no row");
    }
    return toDomain(row);
  }

  async list(): Promise<Todo[]> {
    const rows = await this.db
      .select()
      .from(todos)
      // Secondary sort on id keeps ordering deterministic when two rows share
      // a created_at value (now() is transaction-start time).
      .orderBy(asc(todos.createdAt), asc(todos.id));
    return rows.map(toDomain);
  }

  async get(id: string): Promise<Todo | null> {
    if (!UUID_RE.test(id)) {
      return null;
    }
    const rows = await this.db
      .select()
      .from(todos)
      .where(eq(todos.id, id))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async update(id: string, input: UpdateTodoInput): Promise<Todo | null> {
    if (!UUID_RE.test(id)) {
      return null;
    }
    const patch: Partial<Pick<TodoRow, "text" | "completed">> = {};
    if (input.text !== undefined) {
      patch.text = input.text;
    }
    if (input.completed !== undefined) {
      patch.completed = input.completed;
    }
    // Defensive: the shared schema requires ≥1 field, but if an empty patch
    // reaches here, avoid emitting invalid SQL — just return the current row.
    if (Object.keys(patch).length === 0) {
      return this.get(id);
    }
    const rows = await this.db
      .update(todos)
      .set(patch)
      .where(eq(todos.id, id))
      .returning();
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!UUID_RE.test(id)) {
      return false;
    }
    const rows = await this.db
      .delete(todos)
      .where(eq(todos.id, id))
      .returning({ id: todos.id });
    return rows.length > 0;
  }

  close(): Promise<void> {
    return this.onClose();
  }
}

/** Maps a DB row to the shared domain shape (AD-5): Date → ISO-8601 UTC string. */
function toDomain(row: TodoRow): Todo {
  return {
    id: row.id,
    text: row.text,
    completed: row.completed,
    createdAt: row.createdAt.toISOString(),
  };
}
