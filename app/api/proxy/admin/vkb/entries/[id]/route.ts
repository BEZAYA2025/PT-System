import { NextResponse, type NextRequest } from "next/server";

// Per ADMIN_API_SPEC §13: GET returns the full entry, PATCH accepts
// JSON metadata, DELETE removes. PATCH stays JSON-only here — file
// re-upload happens through a separate flow.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

function getToken(req: NextRequest): string | null {
  return req.cookies.get("access_token")?.value ?? null;
}

async function jsonRelay(
  req: NextRequest,
  method: string,
  url: string,
): Promise<Response> {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  let body: string | undefined;
  if (method !== "GET" && method !== "DELETE") {
    body = await req.text();
  }
  try {
    const upstream = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
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
    console.error(`[proxy] vkb/entries/[id] ${method} failed`, err);
    return NextResponse.json(
      { ok: false, message: "Backend unreachable" },
      { status: 502 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return jsonRelay(
    req,
    "GET",
    `${VPS}/api/admin/vkb/entries/${encodeURIComponent(id)}`,
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return jsonRelay(
    req,
    "PATCH",
    `${VPS}/api/admin/vkb/entries/${encodeURIComponent(id)}`,
  );
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return jsonRelay(
    req,
    "DELETE",
    `${VPS}/api/admin/vkb/entries/${encodeURIComponent(id)}`,
  );
}
