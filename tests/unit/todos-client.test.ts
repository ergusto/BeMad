import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  updateTodo,
  TodoApiError,
} from "@/lib/todos-client";
import { createTodoSchema } from "@/lib/todos";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

const sampleTodo = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  text: "a",
  completed: false,
  createdAt: new Date("2026-07-06T00:00:00.000Z").toISOString(),
};

describe("todos-client wrapper", () => {
  it("fetchTodos returns the todo array on 200", async () => {
    mockFetch(Response.json([sampleTodo], { status: 200 }));
    expect(await fetchTodos()).toEqual([sampleTodo]);
  });

  it("fetchTodos throws TodoApiError on a non-ok response", async () => {
    mockFetch(
      Response.json(
        { error: { code: "INTERNAL", message: "boom" } },
        { status: 500 },
      ),
    );
    await expect(fetchTodos()).rejects.toBeInstanceOf(TodoApiError);
  });

  it("createTodo POSTs and returns the created todo (201)", async () => {
    const spy = mockFetch(Response.json(sampleTodo, { status: 201 }));
    const result = await createTodo({ text: "a" });
    expect(result).toEqual(sampleTodo);
    expect(spy).toHaveBeenCalledWith(
      "/api/todos",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("createTodo surfaces the server error code + message", async () => {
    mockFetch(
      Response.json(
        {
          error: { code: "VALIDATION_ERROR", message: "Task text must not be empty." },
        },
        { status: 400 },
      ),
    );
    await expect(createTodo({ text: "" })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Task text must not be empty.",
    });
  });

  it("falls back to UNKNOWN when the error body is not the envelope", async () => {
    mockFetch(new Response("upstream exploded", { status: 502 }));
    await expect(fetchTodos()).rejects.toMatchObject({ code: "UNKNOWN" });
  });

  it("falls back to UNKNOWN when the error body has no error field", async () => {
    mockFetch(Response.json({ oops: true }, { status: 500 }));
    await expect(createTodo({ text: "a" })).rejects.toMatchObject({
      code: "UNKNOWN",
    });
  });

  it("updateTodo PATCHes /api/todos/:id and returns the updated todo", async () => {
    const updated = { ...sampleTodo, text: "edited" };
    const spy = mockFetch(Response.json(updated, { status: 200 }));
    const result = await updateTodo(sampleTodo.id, { text: "edited" });
    expect(result).toEqual(updated);
    expect(spy).toHaveBeenCalledWith(
      `/api/todos/${sampleTodo.id}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("updateTodo sends a completed-only body (toggle path)", async () => {
    const toggled = { ...sampleTodo, completed: true };
    const spy = mockFetch(Response.json(toggled, { status: 200 }));
    const result = await updateTodo(sampleTodo.id, { completed: true });
    expect(result).toEqual(toggled);
    const [, init] = spy.mock.calls[0]!;
    expect(init).toMatchObject({ method: "PATCH" });
    expect(JSON.parse(String(init?.body))).toEqual({ completed: true });
  });

  it("updateTodo throws TodoApiError with the code on a non-ok response", async () => {
    mockFetch(
      Response.json(
        { error: { code: "NOT_FOUND", message: "Task not found." } },
        { status: 404 },
      ),
    );
    await expect(updateTodo("missing", { text: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deleteTodo resolves on a 204 (no body)", async () => {
    const spy = mockFetch(new Response(null, { status: 204 }));
    await expect(deleteTodo(sampleTodo.id)).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledWith(
      `/api/todos/${sampleTodo.id}`,
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("deleteTodo throws TodoApiError with the code on a non-ok response", async () => {
    mockFetch(
      Response.json(
        { error: { code: "NOT_FOUND", message: "Task not found." } },
        { status: 404 },
      ),
    );
    await expect(deleteTodo("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("client validation mirror (FR-9 parity)", () => {
  it("rejects the same invalid inputs the server rejects", () => {
    expect(createTodoSchema.safeParse({ text: "" }).success).toBe(false);
    expect(createTodoSchema.safeParse({ text: "   " }).success).toBe(false);
    expect(createTodoSchema.safeParse({ text: "a".repeat(1001) }).success).toBe(
      false,
    );
    expect(createTodoSchema.safeParse({ text: "ok" }).success).toBe(true);
  });
});
