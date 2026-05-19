import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?token=... — cheap liveness check so /reset-password doesn't
// render the new-password form for an already-expired link.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return proxyToBackend(req, `/api/auth/validate-reset-token${url.search}`);
}
