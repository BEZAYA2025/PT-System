import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { backendFetch } from "@/lib/backend";
import { OnboardForm } from "@/components/OnboardForm";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Complete setup · PT System",
  description: "Finalize your PT System account.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Mirrors the backend payload of POST /api/auth/validate-signup-token:
// either {email, subscription_tier, expires_at} on success or
// {error: "..."} on 4xx — there is no `valid` flag and the tier field is
// `subscription_tier`, not `tier`. The earlier shape mismatch made every
// valid token appear expired.
interface ValidateResponse {
  email?: string;
  subscription_tier?: string;
  expires_at?: string;
  error?: string;
}

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; session_id?: string; debug?: string }>;
}) {
  const { token, session_id, debug } = await searchParams;
  const debugMode = debug === "1";

  const safeToken = typeof token === "string" ? token.trim() : "";

  // No token + arrived from Stripe checkout → the user just paid; setup email
  // is in flight. Show a thank-you state, not "link expired". Stripe surfaces
  // itself either via the `session_id` query param (when the backend's
  // success_url includes `{CHECKOUT_SESSION_ID}`) or via the Referer header.
  if (!safeToken) {
    const hasSessionId =
      typeof session_id === "string" && session_id.length > 0;
    const referer = (await headers()).get("referer") ?? "";
    const fromStripe = hasSessionId || referer.includes("checkout.stripe.com");

    if (fromStripe) {
      return <StripeRedirectThanks />;
    }
    return <Expired reason="Missing token. Open the link from your welcome email." />;
  }

  const result = await backendFetch<ValidateResponse>(
    "/api/auth/validate-signup-token",
    {
      method: "POST",
      body: JSON.stringify({ token: safeToken }),
    },
  );

  if (!result.ok) {
    const reason = debugMode
      ? `[E1 backend-not-ok] status=${result.status} msg=${result.message}`
      : result.message || "This setup link is invalid or has expired.";
    return <Expired reason={reason} />;
  }
  if (!result.data?.email || !result.data.subscription_tier) {
    const reason = debugMode
      ? `[E2 missing-fields] data=${JSON.stringify(result.data ?? null)}`
      : result.data?.error || "This setup link is invalid or has expired.";
    return <Expired reason={reason} />;
  }

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-xl">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Activate your account
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Set a password and pick a display name. You&apos;ll wire up
              Telegram and Binance from the dashboard right after.
            </p>
          </div>

          <div className="mt-10">
            <OnboardForm
              token={safeToken}
              email={result.data.email}
              tier={result.data.subscription_tier}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StripeRedirectThanks() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-2xl border border-emerald/30 bg-emerald/[0.04] p-8 sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald" />
              Subscription active
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Thanks for subscribing.
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              We just sent a setup link to your inbox. It usually arrives in
              1–2 minutes from{" "}
              <span className="font-mono text-foreground">
                hello@ptsystem.ai
              </span>
              . Open it on this device to finish setting up your password and
              Binance key.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Don&apos;t see it? Check your spam folder — and add{" "}
              <span className="font-mono text-foreground">
                hello@ptsystem.ai
              </span>{" "}
              to your contacts.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signin"
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald px-6 text-sm font-medium text-background transition-colors hover:bg-emerald-hover"
              >
                Already finished setup? Sign in
              </Link>
              <a
                href="mailto:hello@ptsystem.ai"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Expired({ reason }: { reason: string }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-8 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Setup link expired
            </h1>
            <p className="mt-3 text-base text-muted-foreground">{reason}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Setup links are valid for 7 days and one-time use.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald px-6 text-sm font-medium text-background transition-colors hover:bg-emerald-hover"
              >
                Resubscribe
              </Link>
              <a
                href="mailto:hello@ptsystem.ai"
                className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
              >
                Contact support
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
