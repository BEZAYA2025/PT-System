import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Persists user.setup_progress_dismissed = TRUE so the 5-step Setup
// card stays collapsed across devices. Frontend ALSO writes a
// browser-local cookie via /api/setup/dismiss so the UX still works
// while the backend endpoint is being shipped.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/setup-progress-dismiss", {
    requireAuth: true,
  });
}
