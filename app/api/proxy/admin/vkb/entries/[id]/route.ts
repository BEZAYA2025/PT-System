import { NextResponse, type NextRequest } from "next/server";

// Per ADMIN_API_SPEC §13: GET returns the full entry, DELETE
// removes. PATCH now accepts BOTH content-types per the
// Phase-3b/commit abe249c update:
//   · application/json — metadata-only edit (existing path)
//   · multipart/form-data — optional file re-upload + metadata,
//     tags as CSV (string), empty-string clears a field
// The route inspects Content-Type and pipes the body bytes
// through verbatim either way.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

function getToken(req: NextRequest): string | null {
  return req.cookies.get("access_token")?.value ?? null;
}

async function relay(
  req: NextRequest,
  method: "GET" | "PATCH" | "DELETE",
  url: string,
): Promise<Response> {
  const token = getToken(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isMultipart = contentType.toLowerCase().startsWith("multipart/");
  let body: BodyInit | undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (method !== "GET" && method !== "DELETE") {
    if (isMultipart) {
      // Pass through the raw bytes + original Content-Type so the
      // upstream parser sees the original boundary.
      body = await req.arrayBuffer();
      headers["Content-Type"] = contentType;
    } else {
      body = await req.text();
      headers["Content-Type"] = "application/json";
    }
  }

  try {
    const upstream = await fetch(url, {
      method,
      headers,
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
  return relay(
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
  return relay(
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
  return relay(
    req,
    "DELETE",
    `${VPS}/api/admin/vkb/entries/${encodeURIComponent(id)}`,
  );
}
