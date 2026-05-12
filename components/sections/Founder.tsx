import Image from "next/image";
import { Reveal } from "@/components/Reveal";

export function Founder() {
  return (
    <section id="founder" className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40">
      <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[280px_1fr] md:gap-16 lg:grid-cols-[320px_1fr]">
        <Reveal>
          <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-surface md:mx-0 lg:max-w-[320px]">
            <Image
              src="/paul.jpg"
              alt="Paul Theobald"
              width={640}
              height={640}
              priority
              sizes="(min-width: 1024px) 320px, (min-width: 768px) 280px, 80vw"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-t from-background/40 via-transparent to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/[0.04]"
            />
          </div>
        </Reveal>

        <div>
          <Reveal delay={0.05}>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Lead Trader
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Built by a trader, not a marketer.
            </h2>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="mt-8 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
              <p>
                Paul Theobald has been trading crypto professionally for over a
                decade. His focus: BTC and ETH perpetual futures. His method:
                Wave Riding, refined through thousands of trades, real losses,
                and disciplined recovery.
              </p>
              <p>
                He&apos;s not selling promises. He&apos;s running PT System
                with his own capital, his own trades, his own risk. His trades
                are public — entry, exit, ROI, setup score. No USD amounts,
                but the method is fully transparent.
              </p>
              <p>
                What members get isn&apos;t access to his trades. It&apos;s
                access to his thinking, scaled by AI.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
