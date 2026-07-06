import { getRepository } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { createTodoSchema } from "@/lib/todos";

// The pg driver needs the Node.js runtime; the list must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const todos = await getRepository().list();
    return Response.json(todos, { status: 200 });
  } catch (err) {
    console.error("GET /api/todos failed:", err);
    return jsonError("INTERNAL", "Failed to load tasks.", 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  // Server-authoritative validation against the shared schema (AD-5/AD-6).
  const parsed = createTodoSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid task.";
    return jsonError("VALIDATION_ERROR", message, 400);
  }

  try {
    const todo = await getRepository().create(parsed.data);
    return Response.json(todo, { status: 201 });
  } catch (err) {
    console.error("POST /api/todos failed:", err);
    return jsonError("INTERNAL", "Failed to create task.", 500);
  }
}
