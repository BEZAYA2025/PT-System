import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backend endpoint A from Sprint 2 follow-up; arrives ~30–60 min
// after this proxy lands. Until then the upstream 404 surfaces back
// to the client which renders a "Pending — refresh shortly" tile.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  return proxyToBackend(
    req,
    `/api/admin/members/${encodeURIComponent(id)}/trades${url.search}`,
    { requireAuth: true },
  );
}
