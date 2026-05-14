import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Marks the member's first login as complete. Called once on Skip / Done
// from the SpotlightTour. Backend persists user.first_login_completed = TRUE
// + user.first_login_completed_at = NOW().
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/first-login-complete", {
    requireAuth: true,
  });
}
