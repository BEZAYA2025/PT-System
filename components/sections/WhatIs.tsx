import {
  CircleCheck,
  CircleX,
  Compass,
  Eye,
  GraduationCap,
  Radio,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

type Negative = {
  title: string;
  what: string;
  why: string;
};

const negatives: Negative[] = [
  {
    title: "AI Trading Bots",
    what: "Algorithms that trade automatically.",
    why: "You don't learn. You don't understand. When markets shift, the bot is lost — and so are you.",
  },
  {
    title: "Copy Trading",
    what: "Mirror what other traders do.",
    why: "You stay dependent. You never develop your own judgment. When the leader makes mistakes, you make them too.",
  },
  {
    title: "Generic AI Coaches",
    what: "ChatGPT-style assistants without a method.",
    why: "They don't know your trades. They don't know your strategy. Advice without context is just noise.",
  },
];

type Benefit = {
  title: string;
  body: string;
  Icon: LucideIcon;
};

const benefits: Benefit[] = [
  {
    title: "Real Method, Not Generic Advice",
    body:
      "Aven applies a specific framework — Fibonacci, Trendlines, Indicators — the same one Paul uses for every trade.",
    Icon: Compass,
  },
  {
    title: "Knows Your Trades in Real Time",
    body:
      "Connected to your exchange. Sees your entries, your risk, your ROI. Speaks with context, not assumptions.",
    Icon: Eye,
  },
  {
    title: "Teaches You to Trade",
    body:
      "Every conversation is a lesson. Setup scores explain why a trade is 7/10 or 9/10. Post-trade reviews show what worked.",
    Icon: GraduationCap,
  },
  {
    title: "Available 24/7 in Telegram & Web",
    body:
      "Morning briefings. Live trade analysis. Discipline reminders. Always on, always with you.",
    Icon: Radio,
  },
];

export function WhatIs() {
  return (
    <section
      id="what-is"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Not another trading bot.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-8 max-w-3xl text-base leading-[1.8] text-muted-foreground sm:text-lg">
            Trading tools today come in three flavors. None of them actually
            teach you to trade. They either replace you (bots), make you
            dependent (copy trading), or give generic advice (AI coaches).
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-5 lg:gap-8">
          {/* 3 muted negatives */}
          <ul
            className="flex flex-col gap-4 lg:col-span-2"
            aria-label="What's out there"
          >
            {negatives.map((n, idx) => (
              <Reveal key={n.title} delay={0.15 + idx * 0.06}>
                <li className="flex h-full items-start gap-4 rounded-xl border border-border bg-[#0f0f0f] p-5 opacity-70 transition-opacity duration-300 hover:opacity-90 sm:p-6">
                  <CircleX
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground/70"
                  />
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[15px] font-medium text-muted-foreground sm:text-base">
                      {n.title}
                    </p>
                    <p className="text-[13px] text-muted-foreground/85 sm:text-[14px]">
                      {n.what}
                    </p>
                    <p className="text-[12.5px] leading-[1.6] text-muted-foreground/65 sm:text-[13px]">
                      {n.why}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>

          {/* Dominant Aven card */}
          <Reveal delay={0.35} className="lg:col-span-3">
            <div className="relative h-full overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-b from-emerald/[0.07] via-emerald/[0.02] to-transparent p-8 shadow-[0_0_100px_-20px_rgba(16,185,129,0.3)] transition-shadow duration-300 hover:shadow-[0_0_120px_-15px_rgba(16,185,129,0.4)] sm:p-10">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-full border border-emerald/30 bg-emerald/15">
                  <CircleCheck
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="size-6 text-emerald"
                  />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
                  Aven
                </h3>
              </div>

              <p className="mt-5 text-[15px] font-medium text-emerald sm:text-base">
                An AI mentor trained on a real method.
              </p>
              <p className="mt-2 text-[14px] leading-[1.7] text-muted-foreground sm:text-[15px]">
                Built on Paul&apos;s Wave Riding Method, refined through a
                decade of professional trading.
              </p>

              <ul className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6">
                {benefits.map((b) => (
                  <li key={b.title} className="flex gap-3.5">
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald/25 bg-emerald/[0.1]">
                      <b.Icon
                        aria-hidden="true"
                        strokeWidth={1.6}
                        className="size-4 text-emerald"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[14px] font-semibold text-foreground sm:text-[15px]">
                        {b.title}
                      </p>
                      <p className="text-[13px] leading-[1.6] text-muted-foreground sm:text-[14px]">
                        {b.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
