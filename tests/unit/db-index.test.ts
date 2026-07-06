import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;
const DUMMY_URL = "postgres://user:pass@127.0.0.1:5432/db";

describe("getRepository / createTodoRepository", () => {
  beforeEach(() => {
    // Fresh module state so the lazy singleton is re-evaluated per test.
    vi.resetModules();
  });

  afterEach(async () => {
    // The singleton is cached on globalThis (survives resetModules), so clear
    // it explicitly to keep tests isolated.
    const { closeRepository } = await import("@/lib/db");
    await closeRepository();
    if (ORIGINAL_DATABASE_URL === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
    }
  });

  it("getRepository() throws when DATABASE_URL is unset", async () => {
    delete process.env.DATABASE_URL;
    const { getRepository } = await import("@/lib/db");
    expect(() => getRepository()).toThrow(/DATABASE_URL/);
  });

  it("getRepository() returns the same singleton instance", async () => {
    process.env.DATABASE_URL = DUMMY_URL;
    const { getRepository } = await import("@/lib/db");
    const first = getRepository();
    const second = getRepository();
    expect(first).toBe(second);
    // Cleanup handled by afterEach -> closeRepository().
  });

  it("createTodoRepository() exposes the full repository contract", async () => {
    const { createTodoRepository } = await import("@/lib/db");
    const repo = createTodoRepository(DUMMY_URL);
    const methods = [
      "healthcheck",
      "create",
      "list",
      "get",
      "update",
      "delete",
      "close",
    ] as const;
    const asRecord = repo as unknown as Record<string, unknown>;
    for (const method of methods) {
      expect(typeof asRecord[method]).toBe("function");
    }
    await repo.close();
  });
});
