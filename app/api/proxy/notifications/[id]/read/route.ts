import { NextResponse, type NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/proxy-helper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Mark a single notification as read. The id is sanitized before being
// interpolated into the upstream URL — no path-injection surface.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) {
    return NextResponse.json(
      { ok: false, message: "Invalid id" },
      { status: 400 },
    );
  }
  return proxyToBackend(req, `/api/notifications/${id}/read`, {
    requireAuth: true,
  });
}
