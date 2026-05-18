import type { ReactNode } from "react";
import {
  Activity,
  MessageCircle,
  Plug,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { DataFlowConnector } from "@/components/visuals/DataFlowConnector";

type Position = "left" | "right";

type Stage = {
  number: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  position: Position;
  visual: ReactNode;
};

function Chips({
  items,
  badge,
}: {
  items: string[];
  badge?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-md border border-border bg-background px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"
        >
          {label}
        </span>
      ))}
      {badge && (
        <span className="inline-flex items-center rounded-md border border-emerald/30 bg-emerald/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald">
          {badge}
        </span>
      )}
    </div>
  );
}

// Mini multi-timeframe chart for STAGE 02 — 3 overlapping wavy lines.
function TimeframeMiniViz() {
  return (
    <svg
      viewBox="0 0 220 64"
      role="img"
      aria-label="Three overlapping timeframes"
      className="h-16 w-full"
    >
      <rect
        x="0"
        y="0"
        width="220"
        height="64"
        fill="#0a0a0a"
        stroke="#1f1f1f"
        strokeWidth="0.5"
        rx="4"
      />
      <path
        d="M 8 38 Q 50 28, 90 36 T 170 32 T 212 38"
        fill="none"
        stroke="#3a3a3a"
        strokeWidth="1.2"
      />
      <path
        d="M 8 30 Q 50 42, 90 28 T 170 36 T 212 26"
        fill="none"
        stroke="#a0a0a0"
        strokeWidth="1.2"
        opacity="0.7"
      />
      <path
        d="M 8 44 Q 50 22, 90 40 T 170 26 T 212 32"
        fill="none"
        stroke="#10b981"
        strokeWidth="1.4"
        opacity="0.85"
      />
    </svg>
  );
}

// Mini chat preview for STAGE 03.
function ReasoningMiniViz() {
  return (
    <div className="rounded-lg border border-emerald/20 bg-emerald/[0.04] p-3 font-mono text-[11px] leading-relaxed">
      <div className="text-[10px] uppercase tracking-[0.16em] text-emerald">
        Aven
      </div>
      <div className="mt-1 text-foreground/85">
        Confluence: <span className="text-emerald">3</span> sources.
      </div>
      <div className="text-foreground/85">
        Score: <span className="font-semibold text-emerald">8/10</span>
      </div>
    </div>
  );
}

const stages: Stage[] = [
  {
    number: "01",
    title: "Your Exchange, Connected",
    description:
      "Quick setup with a read-only API key. Your funds stay where they are. PT System sees your trades but never trades for you.",
    Icon: Plug,
    position: "left",
    visual: (
      <Chips
        items={[
          "Binance",
          "Bybit",
          "OKX",
          "Bitget",
          "Kucoin",
          "MEXC",
          "Gate.io",
          "Bitunix",
          "Hyperliquid",
        ]}
        badge="Read-Only"
      />
    ),
  },
  {
    number: "02",
    title: "Full Market Context",
    description:
      "Aven sees your trades on every timeframe — from 15m to weekly — plus liquidity, funding, and macro context. Full picture, every time.",
    Icon: Activity,
    position: "right",
    visual: <TimeframeMiniViz />,
  },
  {
    number: "03",
    title: "Aven's Reasoning",
    description:
      "Aven combines your trade context with the method's framework. Generates setup scores, recommendations, and risk warnings — in conversation, not commands.",
    Icon: Sparkles,
    position: "left",
    visual: <ReasoningMiniViz />,
  },
  {
    number: "04",
    title: "Trade with Clarity",
    description:
      "Receive insights via Telegram chat or web dashboard. Morning briefings, setup checks, mid-trade questions, post-trade reviews.",
    Icon: MessageCircle,
    position: "right",
    visual: <Chips items={["Telegram", "Web Dashboard"]} badge="24/7" />,
  },
];

const justifyClass: Record<Position, string> = {
  left: "md:justify-start",
  right: "md:justify-end",
};

function StageCard({ stage }: { stage: Stage }) {
  return (
    <div className={`flex justify-center ${justifyClass[stage.position]}`}>
      <article className="group w-full max-w-[420px] rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald/20 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-emerald/20 bg-emerald/[0.08] transition-transform duration-300 group-hover:scale-105">
            <stage.Icon
              aria-hidden="true"
              strokeWidth={1.6}
              className="size-5 text-emerald"
            />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Step {stage.number}
          </p>
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
          {stage.title}
        </h3>
        <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground sm:text-[15px]">
          {stage.description}
        </p>
        <div className="mt-5">{stage.visual}</div>
      </article>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            How PT System works.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-base leading-[1.8] text-muted-foreground sm:text-lg">
            From your exchange to your screen, in real time.
          </p>
        </Reveal>

        <div className="mt-14 flex flex-col sm:mt-20">
          {stages.map((stage, idx) => {
            const next = stages[idx + 1];
            return (
              <div key={stage.number} className="flex flex-col">
                <Reveal delay={0.05 + idx * 0.1}>
                  <StageCard stage={stage} />
                </Reveal>

                {next && (
                  <>
                    {/* Desktop: bezier connector with traveling emerald dots. */}
                    <Reveal
                      delay={0.05 + idx * 0.1 + 0.05}
                      className="hidden md:block"
                    >
                      <DataFlowConnector
                        direction={
                          stage.position === "left"
                            ? "left-to-right"
                            : "right-to-left"
                        }
                      />
                    </Reveal>

                    {/* Mobile: simple vertical gradient line. */}
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
