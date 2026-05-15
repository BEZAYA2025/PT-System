import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Round-15 notifications: persist per-member channel preferences for
// SL alerts / Setup alerts / Daily brief. Backend expects:
//   POST /api/auth/notification-prefs
//   { sl_alerts: "telegram" | "dashboard" | "both",
//     setup_alerts: "telegram" | "dashboard" | "both",
//     daily_brief: "telegram" | "dashboard" | "both" }

export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/notification-prefs", {
    requireAuth: true,
  });
}

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/notification-prefs", {
    requireAuth: true,
  });
}
