import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createConnection, type DbConnection } from "@/lib/db/client";
import { PostgresTodoRepository } from "@/lib/db/repository";
import { DELETE, PATCH } from "@/app/api/todos/[id]/route";

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const MISSING_UUID = "00000000-0000-0000-0000-000000000000";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown, raw?: string): Request {
  return new Request("http://localhost/api/todos/x", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describeDb("PATCH /api/todos/[id]", () => {
  let conn: DbConnection;
  let repo: PostgresTodoRepository;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    conn = createConnection(TEST_DATABASE_URL!);
    await migrate(conn.db, { migrationsFolder: "./drizzle" });
    repo = new PostgresTodoRepository(conn.db, conn.close);
  });

  afterAll(async () => {
    await conn.close();
    const { closeRepository } = await import("@/lib/db");
    await closeRepository();
  });

  beforeEach(async () => {
    await conn.db.execute(sql`truncate table todos`);
  });

  it("updates the text (200) and persists it", async () => {
    const created = await repo.create({ text: "old" });
    const res = await PATCH(patchRequest({ text: "new" }), ctx(created.id));
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe("new");
    expect((await repo.get(created.id))?.text).toBe("new");
  });

  it("supports a completed-only update without wiping text (route is general)", async () => {
    const created = await repo.create({ text: "task" });
    const res = await PATCH(patchRequest({ completed: true }), ctx(created.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(true);
    // Partial update must NOT clear the untouched field.
    expect(body.text).toBe("task");
    expect((await repo.get(created.id))?.text).toBe("task");
  });

  it.each([
    ["empty", { text: "" }],
    ["whitespace", { text: "   " }],
    ["too long", { text: "a".repeat(1001) }],
    ["NUL byte", { text: `a${String.fromCharCode(0)}b` }],
    ["empty patch", {}],
  ])("rejects %s with 400 VALIDATION_ERROR (prior text kept)", async (_l, body) => {
    const created = await repo.create({ text: "keep" });
    const res = await PATCH(patchRequest(body), ctx(created.id));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect((await repo.get(created.id))?.text).toBe("keep");
  });

  it("rejects malformed JSON with 400 INVALID_JSON", async () => {
    const created = await repo.create({ text: "keep" });
    const res = await PATCH(patchRequest(undefined, "{ not json"), ctx(created.id));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("applies text and completed together in one partial update", async () => {
    const created = await repo.create({ text: "old" });
    const res = await PATCH(
      patchRequest({ text: "new", completed: true }),
      ctx(created.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ text: "new", completed: true });
  });

  it("toggles completed both ways (bi-directional) and persists each", async () => {
    const created = await repo.create({ text: "toggle me" });
    const on = await PATCH(patchRequest({ completed: true }), ctx(created.id));
    expect((await on.json()).completed).toBe(true);
    expect((await repo.get(created.id))?.completed).toBe(true);

    const off = await PATCH(patchRequest({ completed: false }), ctx(created.id));
    expect((await off.json()).completed).toBe(false);
    expect((await repo.get(created.id))?.completed).toBe(false);
  });

  it("ignores unknown fields (Zod strips extras) and updates normally", async () => {
    const created = await repo.create({ text: "old" });
    const res = await PATCH(
      patchRequest({ text: "new", bogus: 123 }),
      ctx(created.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("new");
    expect(body).not.toHaveProperty("bogus");
  });

  it("returns 404 NOT_FOUND for an unknown (valid) id", async () => {
    const res = await PATCH(patchRequest({ text: "x" }), ctx(MISSING_UUID));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 404 NOT_FOUND for a malformed (non-UUID) id — not a 500", async () => {
    const res = await PATCH(patchRequest({ text: "x" }), ctx("garbage"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
  });

  describe("DELETE", () => {
    const deleteRequest = () =>
      new Request("http://localhost/api/todos/x", { method: "DELETE" });

    it("deletes a todo (204) and it is gone afterwards", async () => {
      const created = await repo.create({ text: "delete me" });
      const res = await DELETE(deleteRequest(), ctx(created.id));
      expect(res.status).toBe(204);
      expect(await repo.get(created.id)).toBeNull();
    });

    it("returns 404 NOT_FOUND for an unknown (valid) id", async () => {
      const res = await DELETE(deleteRequest(), ctx(MISSING_UUID));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("NOT_FOUND");
    });

    it("returns 404 NOT_FOUND for a malformed (non-UUID) id — not a 500", async () => {
      const res = await DELETE(deleteRequest(), ctx("garbage"));
      expect(res.status).toBe(404);
      expect((await res.json()).error.code).toBe("NOT_FOUND");
    });

    it("deleting the same id twice returns 204 then 404 (idempotent-safe)", async () => {
      const created = await repo.create({ text: "delete twice" });
      const first = await DELETE(deleteRequest(), ctx(created.id));
      expect(first.status).toBe(204);
      const second = await DELETE(deleteRequest(), ctx(created.id));
      expect(second.status).toBe(404);
      expect((await second.json()).error.code).toBe("NOT_FOUND");
    });
  });
});
