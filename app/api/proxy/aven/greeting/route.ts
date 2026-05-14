import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/aven/greeting — backend returns { greeting: {...} | null }.
// Side-effects on the backend: persists the greeting into aven_conversations
// (so it also surfaces via /api/aven/history) and stamps
// last_dashboard_visit_at.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/aven/greeting", { requireAuth: true });
}
