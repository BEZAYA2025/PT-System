import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(
    req,
    `/api/admin/discount-codes/${encodeURIComponent(id)}`,
    { requireAuth: true },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(
    req,
    `/api/admin/discount-codes/${encodeURIComponent(id)}`,
    { requireAuth: true },
  );
}
