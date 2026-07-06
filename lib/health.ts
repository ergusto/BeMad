import type { TodoRepository } from "@/lib/db";

/**
 * Builds the `/api/health` response from a repository's DB connectivity check:
 * 200 when the database is reachable, 503 when it is not. The body is plain,
 * un-voiced JSON — this is an operational probe, not user-facing copy (AD-8).
 */
export async function healthResponse(repo: TodoRepository): Promise<Response> {
  const ok = await repo.healthcheck();
  return Response.json(
    { status: ok ? "ok" : "unavailable" },
    { status: ok ? 200 : 503 },
  );
}
