// The AD-4 API error contract: `{ error: { code, message } }` where `code` is
// a stable, shared enum and `message` is plain and un-voiced (AD-8). The client
// maps `code` → voiced copy in Epic 3 (Story 3.3); do not voice messages here.

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "NOT_FOUND"
  | "INTERNAL";

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

/** Builds a JSON error response in the shared envelope shape. */
export function jsonError(
  code: ErrorCode,
  message: string,
  status: number,
): Response {
  const body: ApiErrorBody = { error: { code, message } };
  return Response.json(body, { status });
}
