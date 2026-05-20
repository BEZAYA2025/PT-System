import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  return proxyToBackend(
    req,
    `/api/admin/system/services/${encodeURIComponent(name)}/restart`,
    { requireAuth: true },
  );
}
