import type { Metadata } from "next";
import Link from "next/link";
import { backendFetch } from "@/lib/backend";
import { OnboardForm } from "@/components/OnboardForm";
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
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const safeToken = typeof token === "string" ? token.trim() : "";

  if (!safeToken) {
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
    return <Expired reason={result.message || "This setup link is invalid or has expired."} />;
  }
  if (!result.data?.email || !result.data.subscription_tier) {
    return (
      <Expired
        reason={result.data?.error || "This setup link is invalid or has expired."}
      />
    );
  }

  return (
    <>
      <main id="main" className="flex-1 px-6 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>

          <div className="mt-10 sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Finish setting up your account
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Two minutes. Set a password and connect a read-only Binance API
              key so Aven can see your trades.
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

function Expired({ reason }: { reason: string }) {
  return (
    <>
      <main id="main" className="flex-1 px-6 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>

          <div className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-8 sm:p-10">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Setup link expired
            </h1>
            <p className="mt-3 text-base text-muted-foreground">{reason}</p>

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
