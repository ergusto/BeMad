import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createConnection, type DbConnection } from "@/lib/db/client";
import { GET, POST } from "@/app/api/todos/route";

// Route-handler integration against a real Postgres (AD-13). The handlers use
// the getRepository() singleton, so DATABASE_URL is set before any handler call.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

function postRequest(body: unknown, raw?: string): Request {
  return new Request("http://localhost/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
}

describeDb("api/todos route", () => {
  let conn: DbConnection;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DATABASE_URL;
    conn = createConnection(TEST_DATABASE_URL!);
    await migrate(conn.db, { migrationsFolder: "./drizzle" });
  });

  afterAll(async () => {
    await conn.close();
    const { closeRepository } = await import("@/lib/db");
    await closeRepository();
  });

  beforeEach(async () => {
    await conn.db.execute(sql`truncate table todos`);
  });

  it("GET returns [] when there are no todos", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("POST creates a todo (201) and GET then returns it", async () => {
    const postRes = await POST(postRequest({ text: "buy milk" }));
    expect(postRes.status).toBe(201);
    const created = await postRes.json();
    expect(created).toMatchObject({ text: "buy milk", completed: false });
    expect(typeof created.id).toBe("string");

    const getRes = await GET();
    expect(getRes.status).toBe(200);
    const list = await getRes.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(created.id);
  });

  it("POST trims text before persisting", async () => {
    const res = await POST(postRequest({ text: "  spaced  " }));
    expect(res.status).toBe(201);
    expect((await res.json()).text).toBe("spaced");
  });

  it.each([
    ["empty", ""],
    ["whitespace-only", "   "],
  ])("POST rejects %s text with 400 VALIDATION_ERROR", async (_label, text) => {
    const res = await POST(postRequest({ text }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects text over 1000 code points with 400 VALIDATION_ERROR", async () => {
    const res = await POST(postRequest({ text: "a".repeat(1001) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects malformed JSON with 400 INVALID_JSON", async () => {
    const res = await POST(postRequest(undefined, "{ not json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("POST rejects a missing text field with 400 VALIDATION_ERROR", async () => {
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("POST rejects a NUL byte with 400 VALIDATION_ERROR (not a 500)", async () => {
    const res = await POST(postRequest({ text: `a${String.fromCharCode(0)}b` }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("error responses use the AD-4 envelope with a non-empty plain message", async () => {
    const res = await POST(postRequest({ text: "" }));
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "VALIDATION_ERROR", message: expect.any(String) },
    });
    expect(body.error.message.length).toBeGreaterThan(0);
  });

  it.each([
    ["a non-string text", { text: 123 }],
    ["a null text", { text: null }],
    ["a null body", null],
    ["an array body", []],
  ])(
    "POST rejects %s with 400 VALIDATION_ERROR (no type coercion)",
    async (_label, payload) => {
      const res = await POST(postRequest(payload));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("GET returns todos in creation order", async () => {
    const a = await (await POST(postRequest({ text: "first" }))).json();
    const b = await (await POST(postRequest({ text: "second" }))).json();
    const c = await (await POST(postRequest({ text: "third" }))).json();
    const list = await (await GET()).json();
    expect(list.map((t: { id: string }) => t.id)).toEqual([a.id, b.id, c.id]);
  });
});
