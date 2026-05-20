import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return proxyToBackend(req, "/api/admin/system/webhooks", {
    requireAuth: true,
  });
}
