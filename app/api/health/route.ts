import { getRepository } from "@/lib/db";
import { healthResponse } from "@/lib/health";

// The postgres driver needs the Node.js runtime (not the Edge runtime).
export const runtime = "nodejs";
// A readiness probe must never be cached.
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    return await healthResponse(getRepository());
  } catch {
    // A misconfiguration (e.g. missing DATABASE_URL) or repository-construction
    // failure is reported as "unavailable" (503), never as an unhandled 500.
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
