import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Full /api/cockpit/snapshot proxy — used by TopStrip polling, briefing,
// and trades sections in subsequent iterations.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/cockpit/snapshot", { requireAuth: true });
}
