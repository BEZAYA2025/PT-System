import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exchanges the verification token in the body for an onboarding
// token. No session yet — the response carries the onboarding_token
// the client stores in localStorage before redirecting to /onboard.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/verify-email");
}
