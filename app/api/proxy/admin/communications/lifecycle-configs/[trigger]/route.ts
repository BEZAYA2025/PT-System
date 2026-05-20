import type { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Backend §25 Auftrag G: trigger lives in the URL (not the body).
// Per-row PATCH with {template_name, enabled, override_subject?,
// conditions?} updates one lifecycle row.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ trigger: string }> },
) {
  const { trigger } = await params;
  return proxyToBackend(
    req,
    `/api/admin/communications/lifecycle-configs/${encodeURIComponent(trigger)}`,
    { requireAuth: true },
  );
}
