import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Closes the 3-slide welcome modal. Backend persists
// user.onboarding_completed = TRUE. If the endpoint isn't deployed yet
// the proxy will surface the upstream 404; the client treats that as
// non-fatal and still records the dismissal in localStorage so the
// modal doesn't re-trigger on every reload during testing.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/onboarding-complete", {
    requireAuth: true,
  });
}
