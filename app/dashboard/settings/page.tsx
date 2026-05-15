import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { requireUser } from "@/lib/dal";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { TelegramSettingsCard } from "@/components/dashboard/TelegramSettingsCard";
import { ExchangeSettingsCard } from "@/components/dashboard/ExchangeSettingsCard";
import { AccountSettingsCard } from "@/components/dashboard/AccountSettingsCard";

export const metadata: Metadata = {
  title: "Settings · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main id="main" className="px-2 py-8 sm:px-4 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          {/* Prominent back button — large hit target so it's easy to find
              on mobile. Sits above the title rather than as a tiny corner
              link, per Round 9 layout polish. */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-emerald/40 hover:bg-emerald/[0.04] hover:text-foreground"
          >
            <IconArrowLeft size={16} stroke={1.75} aria-hidden />
            Back to dashboard
          </Link>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Account &amp; subscription
            </h1>
          </div>
        </header>

        <SubscriptionCard
          tier={user.tier}
          status={user.subscription_status}
          periodEnd={user.subscription_period_end}
        />

        <TelegramSettingsCard telegramUsername={user.telegram_username} />

        <ExchangeSettingsCard
          connected={user.binance_api_key_connected}
          addedAt={user.binance_api_key_added_at}
          credentialStatus={user.credential_status}
          exchangeType={user.exchange_type ?? null}
          hasExchangeConnection={user.has_exchange_connection}
          invalidSince={user.exchange_credentials_invalid_since ?? null}
        />

        <AccountSettingsCard
          email={user.email}
          displayName={user.display_name}
        />
      </div>
    </main>
  );
}
