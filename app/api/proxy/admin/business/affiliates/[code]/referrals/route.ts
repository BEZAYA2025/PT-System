import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  return proxyToBackend(
    req,
    `/api/admin/business/affiliates/${encodeURIComponent(code)}/referrals`,
    { requireAuth: true },
  );
}
