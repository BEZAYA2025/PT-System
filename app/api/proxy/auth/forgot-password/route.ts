import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pre-auth flow: no session required. Backend always returns 2xx so
// we don't leak which emails exist — the form mirrors that with a
// single generic "Check your inbox" message regardless of outcome.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/forgot-password");
}
