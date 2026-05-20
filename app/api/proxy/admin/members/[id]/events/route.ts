import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  return proxyToBackend(
    req,
    `/api/admin/members/${encodeURIComponent(id)}/events${url.search}`,
    { requireAuth: true },
  );
}
