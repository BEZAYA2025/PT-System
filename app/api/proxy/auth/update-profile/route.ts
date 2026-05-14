import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backend endpoint TBD — bug-fix-list says coordinate the path with Paul
// after this push. Frontend currently posts to /api/auth/update-profile;
// adjust here if the VPS uses /api/auth/profile or a different verb.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, "/api/auth/update-profile", {
    requireAuth: true,
  });
}
