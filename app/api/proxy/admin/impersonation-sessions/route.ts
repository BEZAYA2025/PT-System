import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Active impersonation sessions across the platform — admin-only.
// Useful for spotting stale sessions that should be force-exited
// and for audit visibility into who's looking at whose account.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/admin/impersonation-sessions", {
    requireAuth: true,
  });
}
