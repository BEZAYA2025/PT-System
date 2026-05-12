import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/waitlist-schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const parsed = waitlistSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed.",
        issues: parsed.error.flatten(),
      },
      { status: 422 },
    );
  }

  // Phase 3 will persist to Vercel Postgres + send email via Resend.
  console.log("[waitlist] new signup", {
    receivedAt: new Date().toISOString(),
    ...parsed.data,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
