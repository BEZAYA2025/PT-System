import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  return proxyToBackend(
    req,
    `/api/admin/members/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`,
    { requireAuth: true },
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> },
) {
  const { id, noteId } = await params;
  return proxyToBackend(
    req,
    `/api/admin/members/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`,
    { requireAuth: true },
  );
}
