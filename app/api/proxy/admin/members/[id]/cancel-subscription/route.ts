import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backend endpoint B from Sprint 2 follow-up; live shortly. Proxy
// pre-installed so the frontend wiring lands together with the
// upstream rather than chasing a follow-up deploy.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(
    req,
    `/api/admin/members/${encodeURIComponent(id)}/cancel-subscription`,
    { requireAuth: true },
  );
}
