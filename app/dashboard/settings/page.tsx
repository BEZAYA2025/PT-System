import type { Metadata } from "next";
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
    <main id="main" className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <p className="text-sm text-muted-foreground">Settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Account &amp; subscription
          </h1>
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
        />

        <AccountSettingsCard
          email={user.email}
          displayName={user.display_name}
        />
      </div>
    </main>
  );
}
