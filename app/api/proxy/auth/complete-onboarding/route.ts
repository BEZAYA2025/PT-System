import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";
const IS_PROD = process.env.NODE_ENV === "production";

const AUTH_COOKIE_BASE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_MAX_AGE = 60 * 60;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

// Distinct from /signin: the client sends its own
// `Authorization: Bearer <onboarding_token>` header (not the session
// cookie), so the shared proxy helper — which only forwards the
// cookie-derived access_token — doesn't fit. We forward the client's
// header verbatim, then capture access_token/refresh_token from the
// JSON response so the post-onboarding session lands as httpOnly
// cookies the rest of the app can use.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const body = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(`${VPS}/api/auth/complete-onboarding`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
      },
      body: body.length > 0 ? body : undefined,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[proxy] complete-onboarding fetch failed", err);
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

  if (upstream.ok && data && typeof data === "object") {
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

  return res;
}
