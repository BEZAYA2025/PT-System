import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Per-conversation full transcript. Backend endpoint is on the
// Phase-3 plate — the proxy lands now so the transcript modals
// can light up the moment the upstream responds. Until then a
// 404 here just makes the modal fall back to the snippet view.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(
    req,
    `/api/admin/aven/conversations/${encodeURIComponent(id)}`,
    { requireAuth: true },
  );
}
