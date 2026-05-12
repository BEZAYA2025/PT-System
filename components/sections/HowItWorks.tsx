import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  GraduationCap,
  Plug,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

type Step = {
  number: string;
  name: string;
  title: string;
  body: string;
  Icon: LucideIcon;
  preview: ReactNode;
};

function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/50 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}

const steps: Step[] = [
  {
    number: "01",
    name: "Connect",
    title: "Bring your exchange.",
    body:
      "Read-only API key from Binance, Bybit, OKX, or any major exchange. 30 seconds to set up. PT System sees your positions, your fills, your PnL. It never trades for you.",
    Icon: Plug,
    preview: (
      <PreviewFrame>
        <div className="flex items-center justify-between gap-2">
          <span className="text-foreground/80">Exchange</span>
          <ArrowRight
            aria-hidden="true"
            strokeWidth={1.5}
            className="size-3 text-emerald/80"
          />
          <span className="text-foreground/80">PT System</span>
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-emerald/80">
          Read-only · API key
        </div>
      </PreviewFrame>
    ),
  },
  {
    number: "02",
    name: "Trade",
    title: "You trade. PT System listens.",
    body:
      "Every fill is tracked. Every position state — entry, mark, ROI, liquidation distance — synced in real time from your exchange. No manual logging.",
    Icon: Activity,
    preview: (
      <PreviewFrame>
        <div className="flex items-center justify-between gap-3">
          <span className="text-foreground/90">BTCUSDT · LONG</span>
          <span className="font-medium text-emerald">+6.2%</span>
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
          synced · live
        </div>
      </PreviewFrame>
    ),
  },
  {
    number: "03",
    name: "Spar",
    title: "Ask Aven anything.",
    body:
      "About your setup. Your open trade. The market context. Aven sees your numbers, applies Paul's method, answers in Paul's voice.",
    Icon: Sparkles,
    preview: (
      <PreviewFrame>
        <div className="text-[10px] uppercase tracking-[0.14em] text-emerald">
          You · 14:22
        </div>
        <div className="mt-1.5 font-sans text-[12px] text-foreground/85">
          how does my trade look?
        </div>
      </PreviewFrame>
    ),
  },
  {
    number: "04",
    name: "Learn",
    title: "Get better every day.",
    body:
      "Morning briefings with multi-TF state. Post-trade reviews with score lookback. Pattern feedback when discipline slips. Method, not luck.",
    Icon: GraduationCap,
    preview: (
      <PreviewFrame>
        <div className="text-[10px] uppercase tracking-[0.14em] text-emerald">
          Morning · 7:00
        </div>
        <div className="mt-1.5 text-foreground/85">
          BTC <span className="text-emerald">81,200</span> · RSI{" "}
          <span className="text-emerald">64</span>
        </div>
        <div className="text-foreground/70">
          Setup <span className="text-emerald">7/10</span>
        </div>
      </PreviewFrame>
    ),
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            How PT System works.
          </h2>
        </Reveal>

        <div className="relative mt-14 grid gap-6 sm:mt-20 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-6">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            return (
              <Reveal key={step.number} delay={0.08 + idx * 0.08}>
                <article className="group relative flex h-full min-h-[360px] flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#2a2a2a] sm:p-8">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-2 select-none font-sans text-[112px] font-semibold leading-none tracking-tight text-foreground/[0.045] sm:text-[128px]"
                  >
                    {step.number}
                  </span>

                  <div className="relative flex size-10 items-center justify-center rounded-full border border-emerald/20 bg-emerald/[0.08]">
                    <step.Icon
                      aria-hidden="true"
                      strokeWidth={1.6}
                      className="size-5 text-emerald"
                    />
                  </div>

                  <div className="relative flex flex-1 flex-col gap-3">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      <span>Step {step.number}</span>
                      <span aria-hidden="true" className="mx-2 text-border">
                        /
                      </span>
                      <span className="text-emerald/85">{step.name}</span>
                    </p>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
                      {step.title}
                    </h3>
                    <p className="text-[14px] leading-[1.7] text-muted-foreground sm:text-[15px]">
                      {step.body}
                    </p>
                  </div>

                  <div className="relative">{step.preview}</div>

                  {!isLast && (
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute right-[-15px] top-1/2 z-10 hidden -translate-y-1/2 lg:block"
                    >
                      <ArrowRight
                        strokeWidth={1.5}
                        className="size-4 text-border"
                      />
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
