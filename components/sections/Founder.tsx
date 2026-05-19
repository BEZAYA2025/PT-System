import Image from "next/image";
import { Reveal } from "@/components/Reveal";

export function Founder() {
  return (
    <section id="about" className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 md:grid-cols-[280px_1fr] md:gap-16 lg:grid-cols-[320px_1fr]">
          <Reveal>
            <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-border bg-surface md:mx-0 lg:max-w-[320px]">
              <Image
                src="/paul.jpg"
                alt="Paul"
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
            <Reveal delay={0.12}>
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Built by a trader, for traders.
              </h2>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="mt-8 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
                <p>
                  Paul has been trading crypto professionally for over a
                  decade. His focus: BTC and ETH perpetual futures. His
                  method: Wave Riding — refined through thousands of trades,
                  real losses, and disciplined recovery.
                </p>
                <p>
                  Paul runs PT System with his own capital, his own trades,
                  his own risk. Inside the platform, members see every trade
                  in real time — entry, exit, ROI, setup score, exit reason.
                </p>
              </div>
            </Reveal>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-2xl text-center sm:mt-24">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground/80">
              In Paul&apos;s own words
            </p>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote className="mt-8 space-y-6 font-sans text-lg italic leading-[1.85] text-foreground/90 sm:text-xl">
              <p>
                &ldquo;PT System is the trading mentor I would have wanted
                years ago. One that teaches you to actually understand
                markets — think clearly about setups, respect risk, learn
                from every trade.
              </p>
              <p>
                This isn&apos;t theory or signals. It&apos;s a method refined
                through a decade of professional trading and real losses.
                Aven is how I scale it to every member, without diluting what
                makes it work.&rdquo;
              </p>
            </blockquote>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
