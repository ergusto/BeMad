import { getRepository } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { updateTodoSchema } from "@/lib/todos";

// The pg driver needs the Node.js runtime; mutations must not be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Next 15+/16: dynamic route params are async (a Promise).
interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  // Partial-update validation (≥1 field) against the shared schema (AD-4/AD-6).
  const parsed = updateTodoSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid update.";
    return jsonError("VALIDATION_ERROR", message, 400);
  }

  try {
    // The repository returns null for a missing OR malformed (non-UUID) id,
    // so both resolve cleanly to 404 rather than a raw DB error.
    const updated = await getRepository().update(id, parsed.data);
    if (!updated) {
      return jsonError("NOT_FOUND", "Task not found.", 404);
    }
    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/todos/[id] failed:", err);
    return jsonError("INTERNAL", "Failed to update task.", 500);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  try {
    // The repository returns false for a missing OR malformed (non-UUID) id,
    // so both resolve to 404 rather than a raw DB error.
    const deleted = await getRepository().delete(id);
    if (!deleted) {
      return jsonError("NOT_FOUND", "Task not found.", 404);
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("DELETE /api/todos/[id] failed:", err);
    return jsonError("INTERNAL", "Failed to delete task.", 500);
  }
}
