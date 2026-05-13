import type { Metadata } from "next";
import Link from "next/link";
import { TierCard } from "@/components/TierCard";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Pricing · PT System",
  description:
    "Choose between PT System Standard and VIP. Real trades from Paul, daily briefings from Aven, transparent results.",
  alternates: { canonical: "/pricing" },
};

const STANDARD_FEATURES = [
  "Paul's live trades in real time",
  "Daily Aven briefing",
  "Aven chat — 50 messages / day",
  "Vault Knowledge Base — read access",
  "Trade-monitor alerts via Telegram",
];

const VIP_FEATURES = [
  "Everything in Standard",
  "Unlimited Aven chat",
  "Setup-alerts before Paul takes a trade",
  "Methodology-event notifications",
  "Voice replies from Aven",
  "Custom alert subscriptions",
  "VKB VIP-access — methodology archive",
];

export default function PricingPage() {
  return (
    <>
      <main id="main" className="flex-1 px-6 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>

          <div className="mt-10 max-w-2xl sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Choose your tier
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Trade alongside Paul. Both tiers ship with Aven, the live trades
              feed, and the Vault Knowledge Base. VIP unlocks setup-alerts,
              unlimited Aven, and the methodology archive.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-2 sm:gap-8">
            <TierCard
              tier="standard"
              title="PT System Standard"
              priceLabel="$99"
              priceCadence="/ month"
              description="Trade with Paul, learn the Wave Riding Method."
              features={STANDARD_FEATURES}
            />
            <TierCard
              tier="vip"
              title="PT System VIP"
              priceLabel="$399"
              priceCadence="/ month"
              description="The full cockpit — alerts, voice, methodology archive."
              features={VIP_FEATURES}
              recommended
            />
          </div>

          <p className="mt-10 text-xs text-muted-foreground">
            Cancel anytime via the member dashboard. All prices in USD. After
            payment, you&apos;ll receive a magic-link email to complete setup.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
