import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createConnection, type DbConnection } from "@/lib/db/client";
import { PostgresTodoRepository } from "@/lib/db/repository";
import { todoSchema } from "@/lib/todos";

// Real-Postgres integration (AD-13). Provide TEST_DATABASE_URL (e.g. via
// `docker compose --profile test up -d --wait db-test`) to enable; skipped when
// unset.
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;
const describeDb = TEST_DATABASE_URL ? describe : describe.skip;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describeDb("TodoRepository CRUD (real Postgres)", () => {
  let conn: DbConnection;
  let repo: PostgresTodoRepository;

  beforeAll(async () => {
    conn = createConnection(TEST_DATABASE_URL!);
    await migrate(conn.db, { migrationsFolder: "./drizzle" });
    repo = new PostgresTodoRepository(conn.db, conn.close);
  });

  afterAll(async () => {
    await conn.close();
  });

  beforeEach(async () => {
    await conn.db.execute(sql`truncate table todos`);
  });

  it("create() returns a server UUID, ISO timestamp, and completed=false", async () => {
    const todo = await repo.create({ text: "first" });
    expect(todo.id).toMatch(UUID_RE);
    expect(todo.text).toBe("first");
    expect(todo.completed).toBe(false);
    expect(typeof todo.createdAt).toBe("string");
    expect(Number.isNaN(Date.parse(todo.createdAt))).toBe(false);
  });

  it("get() returns a created todo and null for a missing id", async () => {
    const created = await repo.create({ text: "findme" });
    const found = await repo.get(created.id);
    expect(found).toEqual(created);
    const missing = await repo.get("00000000-0000-0000-0000-000000000000");
    expect(missing).toBeNull();
  });

  it("list() returns todos in creation order", async () => {
    const a = await repo.create({ text: "a" });
    const b = await repo.create({ text: "b" });
    const c = await repo.create({ text: "c" });
    const list = await repo.list();
    expect(list.map((t) => t.id)).toEqual([a.id, b.id, c.id]);
  });

  it("update() changes text and/or completed, returns new state", async () => {
    const created = await repo.create({ text: "before" });
    const textUpdated = await repo.update(created.id, { text: "after" });
    expect(textUpdated?.text).toBe("after");
    expect(textUpdated?.completed).toBe(false);
    const toggled = await repo.update(created.id, { completed: true });
    expect(toggled?.completed).toBe(true);
    expect(toggled?.text).toBe("after");
    const both = await repo.update(created.id, {
      text: "final",
      completed: false,
    });
    expect(both).toMatchObject({ text: "final", completed: false });
  });

  it("update() returns null for a missing id", async () => {
    const result = await repo.update(
      "00000000-0000-0000-0000-000000000000",
      { text: "nope" },
    );
    expect(result).toBeNull();
  });

  it("delete() removes a row (true) and returns false for a missing id", async () => {
    const created = await repo.create({ text: "temp" });
    expect(await repo.delete(created.id)).toBe(true);
    expect(await repo.get(created.id)).toBeNull();
    expect(
      await repo.delete("00000000-0000-0000-0000-000000000000"),
    ).toBe(false);
  });

  it("round-trips snake_case↔camelCase and Date↔ISO correctly", async () => {
    const created = await repo.create({ text: "roundtrip" });
    const [reFetched] = await repo.list();
    expect(reFetched).toEqual(created);
    expect(Object.keys(created).sort()).toEqual([
      "completed",
      "createdAt",
      "id",
      "text",
    ]);
  });

  it("repository output conforms to the shared todoSchema (AD-5 contract)", async () => {
    const created = await repo.create({ text: "contract" });
    expect(todoSchema.safeParse(created).success).toBe(true);
    const [listed] = await repo.list();
    expect(todoSchema.safeParse(listed).success).toBe(true);
  });

  it("list() returns an empty array when there are no todos", async () => {
    expect(await repo.list()).toEqual([]);
  });

  it("update() preserves id and createdAt", async () => {
    const created = await repo.create({ text: "keep-identity" });
    const updated = await repo.update(created.id, { text: "changed" });
    expect(updated?.id).toBe(created.id);
    expect(updated?.createdAt).toBe(created.createdAt);
  });

  it("update() with an empty patch returns the unchanged todo", async () => {
    const created = await repo.create({ text: "unchanged" });
    // Empty object bypasses the shared schema's ≥1-field rule; exercises the
    // repository's defensive branch (no invalid SQL emitted).
    const result = await repo.update(created.id, {});
    expect(result).toEqual(created);
  });
});
