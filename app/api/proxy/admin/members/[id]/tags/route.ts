import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Body: { tag: "string" } — backend treats POST as additive,
// DELETE as removal. Idempotent on both ends so the bulk-tag
// flow can fire-and-forget across an array of selected members.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToBackend(
    req,
    `/api/admin/members/${encodeURIComponent(id)}/tags`,
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
    `/api/admin/members/${encodeURIComponent(id)}/tags`,
    { requireAuth: true },
  );
}
