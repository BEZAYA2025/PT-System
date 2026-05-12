import { Reveal } from "@/components/Reveal";

export function WhatIs() {
  return (
    <section
      id="what-is"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Not another trading bot.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
            <p>
              Most trading tools fall into three categories: bots that trade for
              you, copy-trading that lets you mirror others, or generic AI
              coaches without a specific method.
            </p>
            <p>
              PT System is none of those. It&apos;s a personal trading
              mentor — Paul&apos;s decade of professional crypto trading,
              transferred into an AI partner that thinks like him, speaks
              like him, and teaches like him.
            </p>
            <p>
              Members don&apos;t copy Paul&apos;s trades. They learn his method.
              And they can spar with Aven anytime — about their own setups,
              about market context, about discipline and risk.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
