import { ArrowDown } from "lucide-react";
import { Reveal } from "@/components/Reveal";

type Stage = {
  label: string;
  via?: string;
};

const stages: Stage[] = [
  { label: "Binance Futures API", via: "positions · fills · pnl" },
  { label: "PT System Backend", via: "multi-TF · liquidity · macro" },
  { label: "Aven", via: "reasoning in Paul's voice" },
  { label: "You", via: "via Telegram or Web" },
  { label: "Trade decisions" },
];

export function DataFlow() {
  return (
    <section
      id="data-flow"
      aria-label="How data flows through PT System"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Data flow
          </p>
        </Reveal>

        <ol
          className="mt-10 flex flex-col items-center text-center"
          aria-label="Pipeline stages"
        >
          {stages.map((stage, idx) => {
            const isLast = idx === stages.length - 1;
            return (
              <li
                key={stage.label}
                className="flex w-full flex-col items-center"
              >
                <Reveal delay={0.05 + idx * 0.08}>
                  <p className="text-lg font-medium text-foreground sm:text-xl">
                    {stage.label}
                  </p>
                </Reveal>

                {!isLast && (
                  <Reveal delay={0.05 + idx * 0.08 + 0.04}>
                    <div className="my-6 flex flex-col items-center gap-3 sm:my-8">
                      <span
                        aria-hidden="true"
                        className="block h-12 w-px bg-border sm:h-16"
                      />
                      {stage.via && (
                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {stage.via}
                        </span>
                      )}
                      <ArrowDown
                        aria-hidden="true"
                        strokeWidth={1.5}
                        className="size-4 text-muted-foreground/70"
                      />
                    </div>
                  </Reveal>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
