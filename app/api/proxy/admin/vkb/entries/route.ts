import { NextResponse, type NextRequest } from "next/server";

// VKB create accepts multipart/form-data only (chart image + meta).
// The shared proxy-helper assumes JSON; here we pass the raw request
// body through verbatim and forward the client's Content-Type header
// (boundary included) so the upstream parser sees the original
// multipart envelope. GET stays simple — same Bearer-auth, JSON
// response.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

function getToken(req: NextRequest): string | null {
  return req.cookies.get("access_token")?.value ?? null;
}

export async function GET(req: NextRequest) {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  try {
    const upstream = await fetch(`${VPS}/api/admin/vkb/entries`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { ok: upstream.ok }, {
      status: upstream.status,
    });
  } catch (err) {
    console.error("[proxy] vkb/entries GET failed", err);
    return NextResponse.json(
      { ok: false, message: "Backend unreachable" },
      { status: 502 },
    );
  }
}

export async function POST(req: NextRequest) {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const contentType = req.headers.get("content-type") ?? "";
  // ArrayBuffer keeps the multipart boundary + binary file payload
  // intact; we just hand the bytes to the upstream with the same
  // Content-Type header.
  const body = await req.arrayBuffer();
  try {
    const upstream = await fetch(`${VPS}/api/admin/vkb/entries`, {
      method: "POST",
      headers: {
        ...(contentType ? { "Content-Type": contentType } : {}),
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: "no-store",
    });
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { ok: upstream.ok }, {
      status: upstream.status,
    });
  } catch (err) {
    console.error("[proxy] vkb/entries POST failed", err);
    return NextResponse.json(
      { ok: false, message: "Backend unreachable" },
      { status: 502 },
    );
  }
}
