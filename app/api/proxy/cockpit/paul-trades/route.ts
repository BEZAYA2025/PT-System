import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Member-facing Paul's-trades feed (USD already stripped server-side).
// Response: { open: [...], closed: [...] }
export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/cockpit/paul-trades", {
    requireAuth: true,
  });
}
