import { describe, it, expect, vi } from "vitest";
import { PostgresTodoRepository } from "@/lib/db/repository";

type DbArg = ConstructorParameters<typeof PostgresTodoRepository>[0];

// Minimal fake Drizzle db exposing only the `execute` method the repository
// uses for its health check.
function fakeDb(execute: () => Promise<unknown>): DbArg {
  return { execute } as unknown as DbArg;
}

describe("PostgresTodoRepository", () => {
  it("healthcheck() resolves true when the DB answers", async () => {
    const repo = new PostgresTodoRepository(
      fakeDb(async () => [{ "?column?": 1 }]),
      async () => {},
    );
    expect(await repo.healthcheck()).toBe(true);
  });

  it("healthcheck() resolves false when the query throws (no unhandled rejection)", async () => {
    const repo = new PostgresTodoRepository(
      fakeDb(async () => {
        throw new Error("connection refused");
      }),
      async () => {},
    );
    expect(await repo.healthcheck()).toBe(false);
  });

  it("close() delegates to the provided close handler", async () => {
    const onClose = vi.fn(async () => {});
    const repo = new PostgresTodoRepository(fakeDb(async () => []), onClose);
    await repo.close();
    expect(onClose).toHaveBeenCalledOnce();
  });

  // Note: CRUD behaviour is covered by the real-Postgres integration test
  // (tests/integration/repository.test.ts). The Story 1.1 "not implemented"
  // scope-fence assertions were removed here now that CRUD is implemented.

  describe("malformed (non-UUID) id is treated as not-found (no DB call)", () => {
    // These short-circuit before any query, so the fake db (which would throw
    // on select/update/delete) proves the DB is never touched.
    const repo = () =>
      new PostgresTodoRepository(
        fakeDb(async () => {
          throw new Error("db should not be queried for a malformed id");
        }),
        async () => {},
      );

    it("get() returns null", async () => {
      expect(await repo().get("garbage")).toBeNull();
    });

    it("update() returns null", async () => {
      expect(await repo().update("garbage", { text: "x" })).toBeNull();
    });

    it("delete() returns false", async () => {
      expect(await repo().delete("garbage")).toBe(false);
    });

    it("empty-string id returns null/false", async () => {
      expect(await repo().get("")).toBeNull();
      expect(await repo().delete("")).toBe(false);
    });
  });
});
