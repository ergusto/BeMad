import { describe, it, expect } from "vitest";
import {
  createTodoSchema,
  todoSchema,
  updateTodoSchema,
  todoTextSchema,
} from "@/lib/todos";

describe("todoTextSchema / createTodoSchema", () => {
  it("accepts and trims valid text", () => {
    const result = createTodoSchema.parse({ text: "  buy milk  " });
    expect(result.text).toBe("buy milk");
  });

  it("rejects empty text", () => {
    expect(createTodoSchema.safeParse({ text: "" }).success).toBe(false);
  });

  it("rejects whitespace-only text", () => {
    expect(createTodoSchema.safeParse({ text: "   " }).success).toBe(false);
  });

  it("accepts text at exactly 1000 code points", () => {
    expect(todoTextSchema.safeParse("a".repeat(1000)).success).toBe(true);
  });

  it("rejects text over 1000 code points", () => {
    expect(todoTextSchema.safeParse("a".repeat(1001)).success).toBe(false);
  });

  it("rejects text containing a NUL byte (Postgres text cannot store it)", () => {
    const withNul = `a${String.fromCharCode(0)}b`;
    expect(todoTextSchema.safeParse(withNul).success).toBe(false);
    expect(createTodoSchema.safeParse({ text: withNul }).success).toBe(false);
  });

  it("counts code points, not UTF-16 units (1000 emoji is valid)", () => {
    // 1000 astral-plane emoji = 2000 UTF-16 units but 1000 code points.
    const emoji = "👍".repeat(1000);
    expect(emoji.length).toBe(2000);
    expect(todoTextSchema.safeParse(emoji).success).toBe(true);
    // 1001 emoji exceeds the code-point cap.
    expect(todoTextSchema.safeParse("👍".repeat(1001)).success).toBe(false);
  });
});

describe("updateTodoSchema", () => {
  it("accepts a text-only update", () => {
    expect(updateTodoSchema.safeParse({ text: "new" }).success).toBe(true);
  });

  it("accepts a completed-only update", () => {
    expect(updateTodoSchema.safeParse({ completed: true }).success).toBe(true);
  });

  it("accepts both fields", () => {
    expect(
      updateTodoSchema.safeParse({ text: "new", completed: false }).success,
    ).toBe(true);
  });

  it("rejects an empty update (no fields)", () => {
    expect(updateTodoSchema.safeParse({}).success).toBe(false);
  });

  it("trims text on update", () => {
    const result = updateTodoSchema.parse({ text: "  spaced  " });
    expect(result).toMatchObject({ text: "spaced" });
  });

  it("rejects whitespace-only text on update", () => {
    expect(updateTodoSchema.safeParse({ text: "   " }).success).toBe(false);
  });
});

describe("todoSchema (domain shape)", () => {
  const valid = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    text: "hello",
    completed: false,
    createdAt: new Date().toISOString(),
  };

  it("accepts a well-formed todo", () => {
    expect(todoSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a non-UUID id", () => {
    expect(todoSchema.safeParse({ ...valid, id: "not-a-uuid" }).success).toBe(
      false,
    );
  });

  it("rejects a non-ISO createdAt", () => {
    expect(
      todoSchema.safeParse({ ...valid, createdAt: "yesterday" }).success,
    ).toBe(false);
  });
});
