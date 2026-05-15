import type { NextRequest } from "next/server";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Round-15 notifications: chart-image relay. VPS serves a binary (PNG)
// at /api/notifications/{id}/chart — we forward it raw so the browser
// can <img src> straight into the notification modal. proxyToBackend
// is JSON-only, so this route hand-rolls the binary passthrough.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) {
    return new Response("Invalid id", { status: 400 });
  }

  const token = req.cookies.get("access_token")?.value ?? null;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${VPS}/api/notifications/${id}/chart`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[proxy] chart ${id} fetch failed`, err);
    return new Response("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`Chart ${upstream.status}`, {
      status: upstream.status,
    });
  }

  // Stream the body straight back to the browser. Preserve the upstream
  // content-type (probably image/png) so <img> renders it correctly.
  const contentType =
    upstream.headers.get("content-type") ?? "application/octet-stream";
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Short browser cache — chart is generated once at notification
      // creation and doesn't change after. 5 minutes is enough to dedupe
      // re-opens of the same notification modal.
      "Cache-Control": "private, max-age=300",
    },
  });
}
