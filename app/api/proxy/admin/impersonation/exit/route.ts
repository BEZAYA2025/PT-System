import { NextResponse, type NextRequest } from "next/server";

// Mirror of /impersonate — tells the backend to end the session,
// then unwinds the cookie shell game: restore founder_access_token
// → access_token, delete the stash + meta. If the upstream call
// fails we still restore the founder cookies so the founder isn't
// permanently stuck in the impersonated session.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VPS = process.env.PT_BACKEND_URL ?? "http://145.79.11.110:3000";
const IS_PROD = process.env.NODE_ENV === "production";

const SESSION_COOKIE = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_MAX_AGE = 60 * 60;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const impersonationToken = req.cookies.get("access_token")?.value;
  const founderToken = req.cookies.get("founder_access_token")?.value;
  const founderRefresh = req.cookies.get("founder_refresh_token")?.value;

  // Tell the backend to invalidate the impersonation session. Don't
  // block the cookie restore on upstream errors — better to surface
  // the failure to the user than leave them stuck.
  let upstreamStatus = 0;
  if (impersonationToken) {
    try {
      const upstream = await fetch(
        `${VPS}/api/admin/impersonation/exit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${impersonationToken}`,
          },
          cache: "no-store",
        },
      );
      upstreamStatus = upstream.status;
    } catch (err) {
      console.error("[proxy] impersonation exit fetch failed", err);
    }
  }

  const res = NextResponse.json({
    ok: true,
    upstream_status: upstreamStatus,
    restored: Boolean(founderToken),
  });

  if (founderToken) {
    res.cookies.set("access_token", founderToken, {
      ...SESSION_COOKIE,
      maxAge: ACCESS_MAX_AGE,
    });
  } else {
    // Founder stash missing — clear access_token so the user lands
    // on /signin rather than keeping the impersonation session.
    res.cookies.delete("access_token");
  }
  if (founderRefresh) {
    res.cookies.set("refresh_token", founderRefresh, {
      ...SESSION_COOKIE,
      maxAge: REFRESH_MAX_AGE,
    });
  }
  res.cookies.delete("founder_access_token");
  res.cookies.delete("founder_refresh_token");
  res.cookies.delete("impersonation_meta");

  return res;
}
