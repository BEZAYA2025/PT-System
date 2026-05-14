import type { Metadata } from "next";
import { TierCard } from "@/components/TierCard";
import { SiteHeader } from "@/components/sections/SiteHeader";
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
      <SiteHeader />
      <main id="main" className="relative flex-1 overflow-hidden px-6 py-20 sm:py-28">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald/[0.05] blur-[140px]" />
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/[0.06] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald" />
              Now live
            </span>
            <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Choose your tier
            </h1>
            <p className="mt-5 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
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
