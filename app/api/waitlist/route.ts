import { NextResponse, type NextRequest } from "next/server";
import {
  experienceLabel,
  marketLabels,
  waitlistSchema,
} from "@/lib/waitlist-schema";
import { countRecentSubmissionsByIp, insertWaitlistEntry } from "@/lib/db";
import { sendConfirmationEmail, sendNotificationEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = new Set([
  "https://ptsystem.ai",
  "https://www.ptsystem.ai",
  "http://localhost:3000",
]);

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 3;

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin",
    };
  }
  return {};
}

function originAllowed(origin: string | null): boolean {
  // No Origin header (server-to-server, curl) — allow.
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(origin);
}

function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (!originAllowed(origin)) {
    return NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403, headers },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body." },
      { status: 400, headers },
    );
  }

  const parsed = waitlistSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: "Validation failed.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 422, headers },
    );
  }

  const data = parsed.data;

  // Honeypot: silent success. Bots see 200 OK; nothing is persisted or sent.
  if (data.website && data.website.length > 0) {
    console.log("[waitlist] honeypot tripped", { ip: clientIp(request) });
    return NextResponse.json({ ok: true }, { status: 200, headers });
  }

  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent");

  if (ip) {
    try {
      const recent = await countRecentSubmissionsByIp(ip, RATE_LIMIT_WINDOW_MS);
      if (recent >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { ok: false, message: "Too many requests. Please try again later." },
          { status: 429, headers },
        );
      }
    } catch (err) {
      console.error("[waitlist] rate-limit check failed", err);
      // Fall through — better to accept than to deny on a transient DB hiccup.
    }
  }

  let insertResult;
  try {
    insertResult = await insertWaitlistEntry({
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      experience: data.experience ?? null,
      markets: data.markets,
      challenge: (data.challenge || "").trim() || null,
      source: (data.source || "").trim() || null,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("[waitlist] db insert failed", {
      email: data.email,
      err,
    });
    return NextResponse.json(
      { ok: false, message: "Server error" },
      { status: 500, headers },
    );
  }

  if (insertResult.kind === "duplicate") {
    return NextResponse.json(
      { ok: true, message: "Already on list" },
      { status: 200, headers },
    );
  }

  const row = insertResult.row;

  console.log("[waitlist] dispatching emails", {
    to: row.email,
    notifyConfigured: Boolean(process.env.WAITLIST_NOTIFY_EMAIL),
    fromConfigured: Boolean(process.env.FROM_EMAIL),
  });

  const [confirmation, notification] = await Promise.allSettled([
    sendConfirmationEmail({ to: row.email, name: row.name }),
    sendNotificationEmail({
      name: row.name,
      email: row.email,
      experience: row.experience ? experienceLabel(row.experience) : null,
      markets: marketLabels(data.markets),
      challenge: row.challenge,
      source: row.source,
      ip: row.ip_address,
      createdAt:
        row.created_at instanceof Date
          ? row.created_at.toISOString()
          : String(row.created_at),
    }),
  ]);

  if (confirmation.status === "rejected") {
    console.error(
      "[waitlist] confirmation email failed:",
      confirmation.reason instanceof Error
        ? confirmation.reason.message
        : String(confirmation.reason),
    );
  } else {
    console.log("[waitlist] confirmation email sent", { to: row.email });
  }

  if (notification.status === "rejected") {
    console.error(
      "[waitlist] notification email failed:",
      notification.reason instanceof Error
        ? notification.reason.message
        : String(notification.reason),
    );
  } else {
    console.log("[waitlist] notification email sent");
  }

  return NextResponse.json({ ok: true }, { status: 200, headers });
}
