import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shared by:
//   · Member detail Aven tab — filtered with ?member_id=<id>
//   · Admin Aven section Search tab — no member filter, free-text
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  return proxyToBackend(
    req,
    `/api/admin/aven/conversations/search${url.search}`,
    { requireAuth: true },
  );
}
