import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { PricingPlans } from "./PricingPlans";
import { PricingFaq } from "./PricingFaq";

export const metadata: Metadata = {
  title: "Pricing · PT System",
  description:
    "Start with 14 days free. Aven Standard $99/month or Aven VIP $299/month. Trade with your AI mentor.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="relative flex-1 overflow-hidden px-6 py-20 sm:py-28"
      >
        {/* Subtle emerald glow behind the hero — same treatment the
            landing Hero uses, dialled down. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute left-1/2 top-[-10%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald/[0.05] blur-[140px]" />
        </div>

        <div className="mx-auto w-full max-w-5xl">
          <header className="text-center">
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Pricing
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
              Start with 14 days free. No credit card needed.
            </p>
          </header>

          <PricingPlans />

          <PricingFaq />

          {/* Bottom CTA — final push, centred. */}
          <section className="mx-auto mt-24 max-w-xl text-center sm:mt-32">
            <h2 className="text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl">
              Try Aven free for 14 days.
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              No credit card needed. Cancel anytime.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-emerald px-10 text-base font-semibold text-background transition-colors duration-200 hover:bg-emerald-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald"
            >
              Start Free Trial
            </Link>
          </section>

          {/* Risk disclaimer — small, deliberate, mandatory. */}
          <p className="mx-auto mt-20 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground/70 sm:mt-24">
            Trading cryptocurrency futures involves substantial risk of
            loss. PT System provides educational content only and does
            not constitute financial, investment, or trading advice.
            Past performance is not indicative of future results.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
