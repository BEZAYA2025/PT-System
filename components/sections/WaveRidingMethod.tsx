import { Reveal } from "@/components/Reveal";

const pillars = [
  {
    title: "Fibonacci Levels",
    body:
      "Drawn from anchor highs and lows. Golden Pocket (0.618–0.65) is the strongest reversal zone.",
  },
  {
    title: "Trendlines (Rays)",
    body:
      "From swing points, projected forward. Resistance and support that adapts with structure.",
  },
  {
    title: "Indicators",
    body:
      "RSI, MACD, EMA cluster, VMC Cipher. Confirmation only — never the entry signal alone.",
  },
];

export function WaveRidingMethod() {
  return (
    <section
      id="method"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Three tools. Two confirmations. One method.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-8 max-w-2xl text-base leading-[1.8] text-muted-foreground sm:text-lg">
            Paul&apos;s method is built on three pillars.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:mt-16 md:grid-cols-3">
          {pillars.map((pillar, idx) => (
            <Reveal key={pillar.title} delay={0.15 + idx * 0.08}>
              <article className="flex h-full flex-col gap-3 bg-background p-6 sm:p-8">
                <div
                  aria-hidden="true"
                  className="font-mono text-xs text-muted-foreground"
                >
                  0{idx + 1}
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {pillar.title}
                </h3>
                <p className="text-[15px] leading-[1.7] text-muted-foreground">
                  {pillar.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.4}>
          <p className="mt-12 max-w-2xl text-base leading-[1.8] text-muted-foreground sm:text-lg">
            A setup is valid when at least two of three confirm the same zone.
            Confluence isn&apos;t a bonus —{" "}
            <span className="text-foreground">it&apos;s the rule.</span> Less
            than two means waiting.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
