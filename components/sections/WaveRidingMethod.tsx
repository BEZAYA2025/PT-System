import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { ConfluenceChart } from "@/components/visuals/ConfluenceChart";
import { FibLevelsViz } from "@/components/visuals/FibLevelsViz";
import { TrendlineViz } from "@/components/visuals/TrendlineViz";
import { IndicatorWaveViz } from "@/components/visuals/IndicatorWaveViz";

type Tool = {
  number: string;
  title: string;
  body: string;
  visual: ReactNode;
};

const tools: Tool[] = [
  {
    number: "01",
    title: "Fibonacci Levels",
    body:
      "Drawn from anchor highs and lows. Golden Pocket (0.618–0.65) is the strongest reversal zone.",
    visual: <FibLevelsViz />,
  },
  {
    number: "02",
    title: "Trendlines (Rays)",
    body:
      "From swing points, projected forward. Resistance and support that adapts with structure.",
    visual: <TrendlineViz />,
  },
  {
    number: "03",
    title: "Indicators",
    body:
      "RSI, MACD, EMA cluster, VMC Cipher. Confirmation only — never the entry signal alone.",
    visual: <IndicatorWaveViz />,
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
          <p className="mt-6 max-w-2xl text-base leading-[1.8] text-muted-foreground sm:text-lg">
            The framework Aven applies to every setup.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3 md:gap-6">
          {tools.map((tool, idx) => (
            <Reveal key={tool.number} delay={0.18 + idx * 0.08}>
              <article className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-surface p-6 transition-colors duration-300 hover:border-emerald/20 sm:p-7">
                <div className="overflow-hidden rounded-lg border border-border/80 bg-background/30 p-3">
                  {tool.visual}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Tool {tool.number}
                  </p>
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">
                    {tool.title}
                  </h3>
                  <p className="text-[14px] leading-[1.7] text-muted-foreground sm:text-[15px]">
                    {tool.body}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mx-auto mt-20 max-w-3xl sm:mt-24">
          <Reveal>
            <ConfluenceChart />
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-10 text-center text-base leading-[1.8] text-muted-foreground sm:text-lg">
              A setup is valid when at least two of three confirm the same
              zone. Confluence isn&apos;t a bonus —{" "}
              <span className="text-foreground">it&apos;s the rule.</span>{" "}
              Less than two means waiting.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
