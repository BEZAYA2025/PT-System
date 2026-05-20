import { NextResponse, type NextRequest } from "next/server";

// GET stays JSON (paginated list). POST is multipart — same
// ArrayBuffer + Content-Type pass-through as the VKB route so
// the upstream parser sees the original boundary + binary audio.

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
  const url = new URL(req.url);
  try {
    const upstream = await fetch(
      `${VPS}/api/admin/aven/voice-notes${url.search}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const data = await upstream.json().catch(() => null);
    return NextResponse.json(data ?? { ok: upstream.ok }, {
      status: upstream.status,
    });
  } catch (err) {
    console.error("[proxy] voice-notes GET failed", err);
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
  const body = await req.arrayBuffer();
  try {
    const upstream = await fetch(`${VPS}/api/admin/aven/voice-notes`, {
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
    console.error("[proxy] voice-notes POST failed", err);
    return NextResponse.json(
      { ok: false, message: "Backend unreachable" },
      { status: 502 },
    );
  }
}
