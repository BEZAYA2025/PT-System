"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  GraduationCap,
  Plug,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

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

const easeOut = [0.16, 1, 0.3, 1] as const;

function StepCard({ step, delay }: { step: Step; delay: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.article
      initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: easeOut }}
      className="group relative flex h-full min-h-[360px] flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-emerald/20 hover:shadow-[0_0_60px_-15px_rgba(16,185,129,0.25)] sm:p-8"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-2 select-none bg-gradient-to-b from-emerald/[0.07] to-foreground/[0.02] bg-clip-text font-sans text-[112px] font-semibold leading-none tracking-tight text-transparent sm:text-[128px]"
      >
        {step.number}
      </span>

      <div className="relative flex size-10 items-center justify-center rounded-full border border-emerald/20 bg-emerald/[0.08] transition-transform duration-300 group-hover:scale-105">
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
    </motion.article>
  );
}

function ProgressLine() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 70%", "end 30%"],
  });
  const fill = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 right-0 top-1/2 hidden h-px -translate-y-1/2 overflow-hidden lg:block"
    >
      <div className="absolute inset-0 bg-border/80" />
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald/40 via-emerald to-emerald/40"
        style={{ width: reduce ? "100%" : fill }}
      />
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          How PT System works.
        </motion.h2>

        <div className="relative mt-14 sm:mt-20">
          <ProgressLine />
          <div className="relative grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-6">
            {steps.map((step, idx) => (
              <StepCard
                key={step.number}
                step={step}
                delay={0.05 + idx * 0.15}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
