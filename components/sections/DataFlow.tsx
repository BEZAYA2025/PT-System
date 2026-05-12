import { Plug, Server, Sparkles, Target, User, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { DataFlowConnector } from "@/components/visuals/DataFlowConnector";

type Position = "left" | "right" | "center";

type Stage = {
  title: string;
  Icon: LucideIcon;
  chips: string[];
  position: Position;
  highlight?: boolean;
};

const stages: Stage[] = [
  {
    title: "Exchange API",
    Icon: Plug,
    chips: ["Binance", "Bybit", "OKX", "+more"],
    position: "left",
  },
  {
    title: "PT System Backend",
    Icon: Server,
    chips: ["multi-TF", "liquidity", "macro", "memory"],
    position: "right",
  },
  {
    title: "Aven",
    Icon: Sparkles,
    chips: ["reasoning in Paul's voice"],
    position: "center",
    highlight: true,
  },
  {
    title: "You",
    Icon: User,
    chips: ["Telegram", "Web Cockpit"],
    position: "left",
  },
  {
    title: "Trade decisions",
    Icon: Target,
    chips: ["Setup-Score", "Risk-Aware", "Disciplined"],
    position: "right",
  },
];

const justifyClass: Record<Position, string> = {
  left: "md:justify-start",
  right: "md:justify-end",
  center: "md:justify-center",
};

function StageCard({ stage }: { stage: Stage }) {
  const containerClass = stage.highlight
    ? "rounded-2xl border border-emerald/30 bg-gradient-to-b from-surface to-emerald/[0.04] p-6 shadow-[0_0_60px_-15px_rgba(16,185,129,0.25)] sm:p-7"
    : "rounded-2xl border border-border bg-surface p-6 sm:p-7";

  return (
    <div className={`flex justify-center ${justifyClass[stage.position]}`}>
      <article className={`${containerClass} w-full max-w-[340px]`}>
        <div className="flex items-center gap-3">
          <div
            className={`flex size-9 items-center justify-center rounded-full ${
              stage.highlight
                ? "border border-emerald/30 bg-emerald/15"
                : "border border-emerald/20 bg-emerald/[0.08]"
            }`}
          >
            <stage.Icon
              aria-hidden="true"
              strokeWidth={1.6}
              className="size-4 text-emerald"
            />
          </div>
          <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {stage.title}
          </h3>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {stage.chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex items-center rounded-md border border-border bg-background/40 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
            >
              {chip}
            </span>
          ))}
        </div>
      </article>
    </div>
  );
}

// Connector direction between consecutive stages, indexed by from-stage.
function connectorBetween(from: Position, to: Position) {
  if (from === "left" && to === "right") return "left-to-right" as const;
  if (from === "right" && to === "left") return "right-to-left" as const;
  if (from === "left" && to === "center") return "left-to-center" as const;
  if (from === "center" && to === "left") return "center-to-left" as const;
  if (from === "right" && to === "center") return "right-to-center" as const;
  if (from === "center" && to === "right") return "center-to-right" as const;
  return "left-to-right" as const;
}

export function DataFlow() {
  return (
    <section
      id="data-flow"
      aria-label="How data flows through PT System"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Data flow
          </p>
        </Reveal>

        <div className="mt-12 flex flex-col">
          {stages.map((stage, idx) => {
            const next = stages[idx + 1];
            return (
              <div key={stage.title} className="flex flex-col">
                <Reveal delay={0.05 + idx * 0.1}>
                  <StageCard stage={stage} />
                </Reveal>

                {next && (
                  <>
                    {/* Desktop: SVG bezier with traveling dots. */}
                    <Reveal
                      delay={0.05 + idx * 0.1 + 0.05}
                      className="hidden md:block"
                    >
                      <DataFlowConnector
                        direction={connectorBetween(stage.position, next.position)}
                      />
                    </Reveal>

                    {/* Mobile: simple vertical line. */}
                    <div
                      aria-hidden="true"
                      className="mx-auto my-5 block h-10 w-px bg-gradient-to-b from-border to-emerald/40 md:hidden"
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
