import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

// Speech-to-text for Train-Aven sparring. Multipart pass-through —
// rebuilds the FormData on this side so the upstream fetch
// regenerates the boundary header. The proxyToBackend helper can't
// be used here because it hardcodes Content-Type: application/json,
// which would strip the multipart boundary and break the upload.
//
// Backend contract (ADMIN_API_SPEC §30):
//   POST /api/admin/aven/sparring-stt
//   multipart/form-data: audio (Blob, ≤25MB), language (default 'de')
//   → { text, language, duration_ms }
//
// Transcript lands in the founder's input field for review/edit
// before send — Whisper mangles trading jargon (EMA → Ehema), so
// auto-send would corrupt the curriculum. See QuickCaptureBar's
// onTranscribe flow.
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
    console.error("[proxy/sparring-stt] failed to parse form data", err);
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
    upstream = await fetch(`${VPS}/api/admin/aven/sparring-stt`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: out,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[proxy/sparring-stt] upstream fetch failed", err);
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
