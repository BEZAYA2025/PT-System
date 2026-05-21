import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// History endpoint for Train-Aven sparring + (later) any admin
// conversation listing. Query passthrough preserves the caller's
// filters: ?member_id=<id>&order=asc&limit=200 maps directly to
// the VPS contract.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return proxyToBackend(
    req,
    `/api/admin/aven/conversations${url.search}`,
    { requireAuth: true },
  );
}
