import { describe, it, expect } from "vitest";
import { healthResponse } from "@/lib/health";
import type { TodoRepository } from "@/lib/db";

// A DB-free stub repository so the health contract can be asserted at the unit
// level (fast, no database). The real-Postgres path is covered by the
// integration test in tests/integration/health.test.ts.
function stubRepo(healthy: boolean): TodoRepository {
  const unused = async (): Promise<never> => {
    throw new Error("not used by healthResponse");
  };
  return {
    healthcheck: async () => healthy,
    create: unused,
    list: unused,
    get: unused,
    update: unused,
    delete: unused,
    close: async () => undefined,
  };
}

describe("healthResponse", () => {
  it("returns 200 ok when the repository is healthy", async () => {
    const res = await healthResponse(stubRepo(true));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ status: "ok" });
  });

  it("returns 503 unavailable when the repository is unhealthy", async () => {
    const res = await healthResponse(stubRepo(false));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: "unavailable" });
  });
});
