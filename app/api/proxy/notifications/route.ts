import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

// Forwards limit / offset / unread_only query params verbatim to the
// upstream /api/notifications endpoint.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const upstreamUrl = `${VPS}/api/notifications${qs ? `?${qs}` : ""}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[proxy/notifications] upstream fetch failed", err);
    return NextResponse.json(
      { ok: false, message: "Backend unreachable" },
      { status: 502 },
    );
  }

  let data: unknown = null;
  try {
    data = await upstream.json();
  } catch {
    data = null;
  }
  return NextResponse.json(data ?? {}, { status: upstream.status });
}
