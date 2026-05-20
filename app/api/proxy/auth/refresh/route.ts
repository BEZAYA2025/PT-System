import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LOGIN-4 fix: silent client-side token refresh.
//
// Reads the httpOnly refresh_token cookie that the signin / complete-
// signup / complete-onboarding proxies set, posts it to the backend's
// /api/auth/refresh, captures the new access_token + refresh_token
// from the response, and writes them as fresh cookies on the Vercel
// domain. Used by FetchAuthInterceptor as the first response to a
// /api/* 401 — only if refresh fails does the user get bounced to
// /signin.
//
// If the backend exposes the refresh endpoint under a different path
// or expects a different body shape, change it here only — the
// interceptor just POSTs to this URL with no body.
//
// On a hard failure (401/403 from the upstream — typically because
// the refresh token itself has expired or been revoked) we delete
// both cookies so the next request doesn't loop on a doomed retry;
// the interceptor then takes the user to /signin.

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";
const IS_PROD = process.env.NODE_ENV === "production";

const COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};
const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { ok: false, message: "No refresh token" },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${VPS}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[proxy] /api/auth/refresh fetch failed", err);
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

  const res = NextResponse.json(data ?? { ok: upstream.ok }, {
    status: upstream.status,
  });

  if (upstream.ok && data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.access_token === "string") {
      res.cookies.set("access_token", d.access_token, {
        ...COOKIE_BASE,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });
    }
    if (typeof d.refresh_token === "string") {
      res.cookies.set("refresh_token", d.refresh_token, {
        ...COOKIE_BASE,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }
  }

  if (upstream.status === 401 || upstream.status === 403) {
    res.cookies.delete("access_token");
    res.cookies.delete("refresh_token");
  }

  return res;
}
