import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = ReturnType<typeof drizzle>;

export interface DbConnection {
  db: Database;
  close: () => Promise<void>;
}

/**
 * Creates the Drizzle client over a postgres.js connection. This is the ONLY
 * module in the codebase that imports the database driver — every other layer
 * reaches persistence through the repository (AD-1, AD-2).
 */
export function createConnection(databaseUrl: string): DbConnection {
  const client = postgres(databaseUrl, {
    max: 5,
    connect_timeout: 5, // seconds — fail fast when the DB is unreachable
    idle_timeout: 20,
    onnotice: () => {},
  });
  const db = drizzle(client);
  return {
    db,
    close: () => client.end({ timeout: 5 }),
  };
}
