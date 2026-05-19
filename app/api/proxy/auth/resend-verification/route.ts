import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Issues a fresh verification email when the original link expired.
// Body: { email }. Like /forgot-password, backend always returns 2xx
// so existence of an account isn't leaked back to the caller.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/resend-verification");
}
