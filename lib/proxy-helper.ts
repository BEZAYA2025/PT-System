import { NextResponse, type NextRequest } from "next/server";

// "Vercel proxy" pattern — Next.js Route Handlers that forward to the VPS
// backend. NOT to be confused with Next.js 16's `proxy.ts` (the renamed
// middleware) at the project root.

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";

const IS_PROD = process.env.NODE_ENV === "production";

const AUTH_COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  // SameSite=Lax (not Strict per spec) so the auth cookie survives Stripe
  // billing-portal redirects back to /dashboard/settings. CSRF protection is
  // still in place (Lax blocks cross-site POSTs).
  path: "/",
};

const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface ProxyOptions {
  /** Send Authorization: Bearer <access_token> read from the request cookie. */
  withAuth?: boolean;
  /** Reject with 401 if no access_token cookie is present. */
  requireAuth?: boolean;
  /**
   * Capture access_token / refresh_token from backend JSON response and write
   * them as cookies on the Vercel domain. Used by signin / complete-signup.
   */
  captureTokens?: boolean;
  /** Delete auth cookies after the upstream call (used for signout). */
  clearCookies?: boolean;
}

export async function proxyToBackend(
  req: NextRequest,
  vpsPath: string,
  options: ProxyOptions = {},
): Promise<Response> {
  const {
    withAuth = false,
    requireAuth = false,
    captureTokens = false,
    clearCookies = false,
  } = options;

  const cookieToken = req.cookies.get("access_token")?.value ?? null;

  if (requireAuth && !cookieToken) {
    return Response.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  let bodyText: string | null = null;
  if (req.method !== "GET" && req.method !== "HEAD") {
    bodyText = await req.text();
  }

  const useAuth = withAuth || requireAuth;

  let upstream: Response;
  try {
    upstream = await fetch(`${VPS}${vpsPath}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        ...(useAuth && cookieToken
          ? { Authorization: `Bearer ${cookieToken}` }
          : {}),
      },
      body: bodyText && bodyText.length > 0 ? bodyText : undefined,
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[proxy] ${req.method} ${vpsPath} fetch failed`, err);
    return Response.json(
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

  if (captureTokens && upstream.ok && data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.access_token === "string") {
      res.cookies.set("access_token", d.access_token, {
        ...AUTH_COOKIE_BASE,
        maxAge: ACCESS_TOKEN_MAX_AGE,
      });
    }
    if (typeof d.refresh_token === "string") {
      res.cookies.set("refresh_token", d.refresh_token, {
        ...AUTH_COOKIE_BASE,
        maxAge: REFRESH_TOKEN_MAX_AGE,
      });
    }
  }

  if (clearCookies) {
    res.cookies.delete("access_token");
    res.cookies.delete("refresh_token");
  }

  return res;
}
