import type { NextRequest } from "next/server";

// Node runtime, not Edge. Edge runtime on Vercel ran into two issues with
// the HTTP-only VPS backend during production testing: outbound HTTP (no TLS)
// hits intermittent restrictions, and `req.signal` forwarding aborted the
// upstream stream prematurely on some routes. Node runtime supports
// streaming pass-through via Response(upstream.body, ...) just as well and
// has no HTTP outbound issues.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

// EventSource cannot send custom headers from the browser, so the cookie is
// the only auth path on the proxy front-door. The upstream call adds
// Authorization: Bearer; the VPS spec also accepts ?token=<jwt> so we forward
// the token as a query param too as a belt-and-braces fallback.
export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const params = new URLSearchParams(url.searchParams);
  // Don't leak the cookie token through proxy URL — but DO add it to the
  // upstream URL since the VPS accepts ?token= as a fallback.
  params.set("token", token);
  const upstreamUrl = `${VPS}/api/events?${params.toString()}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      cache: "no-store",
      // No signal forwarding — kept the upstream alive even when the
      // client temporarily reconnects.
    });
  } catch (err) {
    console.error("[proxy/events] upstream fetch failed", {
      url: upstreamUrl.replace(token, "<redacted>"),
      err: err instanceof Error ? err.message : String(err),
    });
    return new Response("Backend unreachable", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    console.error("[proxy/events] upstream non-ok", {
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
      // Disable nginx-style buffering when present.
      "X-Accel-Buffering": "no",
    },
  });
}
