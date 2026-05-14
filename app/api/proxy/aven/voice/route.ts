import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

// Multipart pass-through — re-builds FormData on the proxy side so fetch
// regenerates the boundary header for the upstream request.
export async function POST(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let incoming: FormData;
  try {
    incoming = await req.formData();
  } catch (err) {
    console.error("[proxy/aven/voice] failed to parse form data", err);
    return NextResponse.json(
      { ok: false, message: "Invalid audio upload" },
      { status: 400 },
    );
  }

  const out = new FormData();
  for (const [k, v] of incoming.entries()) {
    out.append(k, v);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${VPS}/api/aven/voice`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: out,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[proxy/aven/voice] upstream fetch failed", err);
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
