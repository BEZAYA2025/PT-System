import { CircleCheck, CircleX } from "lucide-react";
import { Reveal } from "@/components/Reveal";

type Negative = {
  title: string;
  subtitle: string;
};

const negatives: Negative[] = [
  { title: "AI Trading Bots", subtitle: "Trade automatically. Learn nothing." },
  { title: "Copy Trading", subtitle: "Mirror others. Stay dependent." },
  { title: "Generic AI Coaches", subtitle: "No specific method. No real context." },
];

export function WhatIs() {
  return (
    <section
      id="what-is"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Not another trading bot.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 max-w-3xl space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
            <p>
              Most trading tools fall into three categories: bots that trade
              for you, copy-trading that lets you mirror others, or generic
              AI coaches without a specific method.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-5 md:gap-6 lg:mt-16">
          <ul className="flex flex-col gap-4 md:col-span-3" aria-label="Other categories">
            {negatives.map((n, idx) => (
              <Reveal key={n.title} delay={0.15 + idx * 0.06}>
                <li className="flex items-start gap-4 rounded-xl border border-border bg-[#0f0f0f] p-5 opacity-70 transition-opacity hover:opacity-90 sm:p-6">
                  <CircleX
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="mt-0.5 size-5 shrink-0 text-muted-foreground/70"
                  />
                  <div className="flex flex-col gap-1">
                    <p className="text-[15px] font-medium text-muted-foreground sm:text-base">
                      {n.title}
                    </p>
                    <p className="text-[13px] text-muted-foreground/70 sm:text-sm">
                      {n.subtitle}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={0.35} className="md:col-span-2">
            <div className="relative h-full overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-b from-emerald/[0.06] via-emerald/[0.02] to-transparent p-8 shadow-[0_0_80px_-20px_rgba(16,185,129,0.25)] transition-shadow duration-300 hover:shadow-[0_0_100px_-15px_rgba(16,185,129,0.35)] sm:p-10">
              <div className="flex size-12 items-center justify-center rounded-full border border-emerald/30 bg-emerald/10">
                <CircleCheck
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-6 text-emerald"
                />
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
                PT System
              </h3>
              <p className="mt-2 text-[15px] text-emerald sm:text-base">
                A personal trading mentor with method, context, and
                discipline.
              </p>
              <p className="mt-6 text-[14px] leading-[1.7] text-muted-foreground sm:text-[15px]">
                Paul&apos;s decade of professional crypto trading, transferred
                into an AI partner that thinks like him, speaks like him, and
                teaches like him. Members don&apos;t copy trades. They learn
                the method — and spar with Aven anytime.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
