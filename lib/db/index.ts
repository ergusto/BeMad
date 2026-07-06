import { createConnection } from "./client";
import { PostgresTodoRepository } from "./repository";
import type { TodoRepository } from "./repository";

export type { TodoRepository } from "./repository";

/**
 * Constructs a repository bound to a specific database URL. Used in tests to
 * target an isolated test Postgres, and internally by {@link getRepository}.
 */
export function createTodoRepository(databaseUrl: string): TodoRepository {
  const { db, close } = createConnection(databaseUrl);
  return new PostgresTodoRepository(db, close);
}

// Cache the singleton on globalThis so Next.js dev/HMR module re-evaluation
// reuses one connection pool instead of stranding a new one on every reload.
const globalForRepo = globalThis as unknown as {
  __todoRepository?: TodoRepository;
};

/**
 * The default repository, lazily created from `DATABASE_URL`. Route handlers
 * consume this; the client/UI never imports it (AD-1).
 */
export function getRepository(): TodoRepository {
  if (!globalForRepo.__todoRepository) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForRepo.__todoRepository = createTodoRepository(url);
  }
  return globalForRepo.__todoRepository;
}

/**
 * Closes the default repository's connection pool and clears the cached
 * instance so a subsequent {@link getRepository} call creates a fresh one.
 */
export async function closeRepository(): Promise<void> {
  if (globalForRepo.__todoRepository) {
    await globalForRepo.__todoRepository.close();
    globalForRepo.__todoRepository = undefined;
  }
}
