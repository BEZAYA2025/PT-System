import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return proxyToBackend(
    req,
    `/api/admin/communications/send-history${url.search}`,
    { requireAuth: true },
  );
}
