import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "setup_dismissed_at";
const IS_PROD = process.env.NODE_ENV === "production";

// Banner-dismissal lives entirely on the Vercel side — no backend call.
// Setting the cookie hides the Setup-Progress card permanently for this
// browser; the small "All set" indicator takes over.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, new Date().toISOString(), {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
