import type { NextRequest } from "next/server";

// SSE pass-through — same approach as /api/proxy/aven/observations.
// The browser opens an EventSource which can't carry Authorization
// headers; we read the access_token from the httpOnly cookie and
// forward it both as a Bearer header AND as a ?token= belt-and-
// braces fallback on the upstream URL.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const params = new URLSearchParams(url.searchParams);
  params.set("token", token);
  const upstreamUrl = `${VPS}/api/admin/aven/live-stream?${params.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });
  } catch (err) {
    console.error("[proxy/admin/aven/live-stream] upstream fetch failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response(`Stream failed (${upstream.status})`, {
      status: upstream.status || 502,
    });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
