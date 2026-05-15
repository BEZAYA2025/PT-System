import type { NextRequest } from "next/server";

// Round-19: SSE proxy for /api/aven/observations. The endpoint streams
// "Aven is currently looking at X" market observations that drive the
// rotating ticker under the AI Mentor / Aven identity row. Same
// passthrough pattern as /api/proxy/events — Node runtime, cookie-only
// auth on the front-door, ?token= as a belt-and-braces fallback on
// the upstream URL.

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
  const upstreamUrl = `${VPS}/api/aven/observations?${params.toString()}`;

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
    console.error("[proxy/aven/observations] upstream fetch failed", {
      url: upstreamUrl.replace(token, "<redacted>"),
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    console.error("[proxy/aven/observations] upstream non-ok", {
      status: upstream.status,
      hasBody: Boolean(upstream.body),
    });
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
