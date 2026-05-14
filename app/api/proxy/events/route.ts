import type { NextRequest } from "next/server";

// Edge runtime is the right home for SSE — it streams the upstream body
// straight to the client without buffering. The Node runtime would buffer
// in some Vercel paths.
export const runtime = "edge";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const qs = url.searchParams.toString();
  const upstreamUrl = `${VPS}/api/events${qs ? `?${qs}` : ""}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      cache: "no-store",
      // Forward client abort upstream so we don't keep the VPS connection
      // open after the browser navigates away.
      signal: req.signal,
    });
  } catch (err) {
    console.error("[proxy/events] upstream fetch failed", err);
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
      // Disable nginx-style buffering when present.
      "X-Accel-Buffering": "no",
    },
  });
}
