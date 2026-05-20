import { NextResponse, type NextRequest } from "next/server";

// Bespoke proxy — the standard helper can't do the cookie shell
// game this flow needs:
//   1. Forward founder's access_token to the backend.
//   2. On success, MOVE the founder's tokens into stash cookies
//      (founder_access_token / founder_refresh_token) so /exit can
//      restore them.
//   3. Replace access_token with the impersonation_token so every
//      subsequent SSR / fetch runs as the impersonated member.
//   4. Write a non-httpOnly impersonation_meta cookie carrying
//      {member_id, member_name, member_email, expires_at, started_at}
//      so the client banner can render countdown + member context
//      without needing a fresh fetch.

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

const META_COOKIE = {
  httpOnly: false,
  secure: IS_PROD,
  sameSite: "lax" as const,
  path: "/",
};

const FOUNDER_STASH_MAX_AGE = 60 * 60 * 2; // 2h — safe over the 1h imp window

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const founderToken = req.cookies.get("access_token")?.value;
  const founderRefresh = req.cookies.get("refresh_token")?.value;
  if (!founderToken) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }
  const bodyText = await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(
      `${VPS}/api/admin/members/${encodeURIComponent(id)}/impersonate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${founderToken}`,
        },
        body: bodyText.length > 0 ? bodyText : undefined,
        cache: "no-store",
      },
    );
  } catch (err) {
    console.error("[proxy] impersonate fetch failed", err);
    return NextResponse.json(
      { ok: false, message: "Backend unreachable" },
      { status: 502 },
    );
  }

  const data = await upstream.json().catch(() => null);
  const res = NextResponse.json(data ?? { ok: upstream.ok }, {
    status: upstream.status,
  });

  if (!upstream.ok || !data || typeof data !== "object") {
    return res;
  }

  const d = data as Record<string, unknown>;
  const imp =
    typeof d.impersonation_token === "string"
      ? d.impersonation_token
      : typeof d.access_token === "string"
        ? (d.access_token as string)
        : null;
  if (!imp) return res;

  const expiresAt =
    typeof d.expires_at === "string" ? d.expires_at : null;
  const memberName =
    typeof d.member_name === "string" ? d.member_name : null;
  const memberEmail =
    typeof d.member_email === "string" ? d.member_email : null;

  // Stash founder tokens. Two-hour max-age — comfortably wider than
  // the spec'd 1h impersonation window so a slightly slow exit still
  // restores cleanly.
  res.cookies.set("founder_access_token", founderToken, {
    ...SESSION_COOKIE,
    maxAge: FOUNDER_STASH_MAX_AGE,
  });
  if (founderRefresh) {
    res.cookies.set("founder_refresh_token", founderRefresh, {
      ...SESSION_COOKIE,
      maxAge: FOUNDER_STASH_MAX_AGE,
    });
  }
  // Swap session.
  res.cookies.set("access_token", imp, {
    ...SESSION_COOKIE,
    maxAge: 60 * 60,
  });
  // UI metadata — readable from JS for the banner countdown.
  res.cookies.set(
    "impersonation_meta",
    JSON.stringify({
      member_id: id,
      member_name: memberName,
      member_email: memberEmail,
      expires_at: expiresAt,
      started_at: new Date().toISOString(),
    }),
    {
      ...META_COOKIE,
      maxAge: 60 * 60,
    },
  );

  return res;
}
