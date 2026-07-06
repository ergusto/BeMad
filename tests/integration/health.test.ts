import { describe, it, expect } from "vitest";
import { createTodoRepository } from "@/lib/db";
import { healthResponse } from "@/lib/health";

// Port 1 refuses connections immediately, giving a deterministic "DB down"
// case without any external dependency.
const UNREACHABLE_DB_URL = "postgres://bemad:bemad@127.0.0.1:1/bemad";

// The "DB up" case needs a real Postgres (AD-13: the DB boundary is tested
// against a real database, not a mock). Provide TEST_DATABASE_URL — e.g. via
// the `test` compose profile — to enable it; it is skipped when unset.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

describe("GET /api/health", () => {
  describe("when the database is unreachable", () => {
    it("healthcheck() resolves false", async () => {
      const repo = createTodoRepository(UNREACHABLE_DB_URL);
      try {
        expect(await repo.healthcheck()).toBe(false);
      } finally {
        await repo.close();
      }
    });

    it("responds 503 unavailable", async () => {
      const repo = createTodoRepository(UNREACHABLE_DB_URL);
      try {
        const res = await healthResponse(repo);
        expect(res.status).toBe(503);
        expect(await res.json()).toEqual({ status: "unavailable" });
      } finally {
        await repo.close();
      }
    });
  });

  const describeUp = TEST_DATABASE_URL ? describe : describe.skip;
  describeUp("when the database is reachable", () => {
    it("healthcheck() resolves true", async () => {
      const repo = createTodoRepository(TEST_DATABASE_URL!);
      try {
        expect(await repo.healthcheck()).toBe(true);
      } finally {
        await repo.close();
      }
    });

    it("responds 200 ok", async () => {
      const repo = createTodoRepository(TEST_DATABASE_URL!);
      try {
        const res = await healthResponse(repo);
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ status: "ok" });
      } finally {
        await repo.close();
      }
    });
  });
});
