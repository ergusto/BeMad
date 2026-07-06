import { describe, it, expect, afterEach, vi } from "vitest";
import * as route from "@/app/api/health/route";

const ORIGINAL_DATABASE_URL = process.env.DATABASE_URL;

// Guards the Next.js route-segment config that the health probe depends on:
// the pg driver needs the Node.js runtime, and a readiness probe must not be
// statically cached.
describe("app/api/health/route", () => {
  it("uses the Node.js runtime (required by the postgres driver)", () => {
    expect(route.runtime).toBe("nodejs");
  });

  it("is force-dynamic so the probe is never cached", () => {
    expect(route.dynamic).toBe("force-dynamic");
  });

  it("exports a GET handler", () => {
    expect(typeof route.GET).toBe("function");
  });

  describe("GET error handling", () => {
    afterEach(async () => {
      const { closeRepository } = await import("@/lib/db");
      await closeRepository();
      if (ORIGINAL_DATABASE_URL === undefined) {
        delete process.env.DATABASE_URL;
      } else {
        process.env.DATABASE_URL = ORIGINAL_DATABASE_URL;
      }
      vi.resetModules();
    });

    it("returns 503 (not an unhandled throw) when DATABASE_URL is unset", async () => {
      vi.resetModules();
      delete process.env.DATABASE_URL;
      // Ensure no cached singleton from another test satisfies getRepository().
      const { closeRepository } = await import("@/lib/db");
      await closeRepository();
      const freshRoute = await import("@/app/api/health/route");
      const res = await freshRoute.GET();
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ status: "unavailable" });
    });
  });
});
