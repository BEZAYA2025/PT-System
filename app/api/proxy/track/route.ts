import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Activity tracker — fire-and-forget. Authenticated users get their
// access_token forwarded (so the backend can correlate session →
// user); anonymous events still go through with no Authorization
// header so we can capture pre-signin page views too.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/track", { withAuth: true });
}
