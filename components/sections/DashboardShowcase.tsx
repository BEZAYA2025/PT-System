"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Reveal } from "@/components/Reveal";
import { BrandLogo } from "@/components/dashboard/BrandLogo";

// Landing-page Section #3 — "Dashboard + Aven Showcase". Round-28
// iteration: fixed-size frame (no breathing between phases), TradingView-
// style chart, timeframe badges on the brief, Your-Trades + Paul's-
// Trades grid, slower / smoother transitions so a trader can watch
// the loop for 30s without overload.

type Phase = "idle" | "setup" | "discipline";

const PHASE_ORDER: ReadonlyArray<Phase> = ["idle", "setup", "discipline"];

// Slowed loop — was 5/16/11s, now 10/22/16s. With AnimatePresence's
// 0.6s exit + 0.4s entry-delay pause between phases the total cycle
// lands around 50-52s.
const PHASE_DURATION_MS: Record<Phase, number> = {
  idle: 10000,
  setup: 22000,
  discipline: 16000,
};

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Live dashboard",
  setup: "Setup conversation",
  discipline: "Mid-trade discipline",
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.65, 0.05, 0.36, 1] as const;

export function DashboardShowcase() {
  return (
    <section
      id="dashboard-showcase"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            This is how Aven thinks with you.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Live, in your dashboard. Every day.
          </p>
        </Reveal>

        <Reveal delay={0.2} className="mt-16 sm:mt-20">
          <AnimatedShowcase />
        </Reveal>

        <Reveal delay={0.1} className="mt-10 sm:mt-12">
          <CaptionBullets />
        </Reveal>

        <Reveal delay={0.15} className="mt-10 sm:mt-12">
          <p className="text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
            Everything you see is real. Built and used every day by Paul.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Phase state machine.
// ---------------------------------------------------------------------------

function useStoryPhase({
  paused,
  reduce,
}: {
  paused: boolean;
  reduce: boolean;
}) {
  // Reduced-motion users see the setup phase frozen — that's the
  // most representative single frame (conversation + chart visible).
  const [phase, setPhase] = useState<Phase>(reduce ? "setup" : "idle");

  useEffect(() => {
    if (reduce || paused) return;
    const id = setTimeout(() => {
      setPhase((p) => {
        const idx = PHASE_ORDER.indexOf(p);
        return PHASE_ORDER[(idx + 1) % PHASE_ORDER.length];
      });
    }, PHASE_DURATION_MS[phase]);
    return () => clearTimeout(id);
  }, [phase, paused, reduce]);

  return { phase, setPhase };
}

// ---------------------------------------------------------------------------
// Animated showcase shell.
// ---------------------------------------------------------------------------

function AnimatedShowcase() {
  const reduce = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);
  const { phase, setPhase } = useStoryPhase({ paused, reduce });

  return (
    <div>
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <DashboardFrame>
          <DashboardHeaderStrip />
          <AnimatedTopRow phase={phase} reduce={reduce} paused={paused} />
          <AnimatedAvenSection phase={phase} reduce={reduce} />
          <div className="grid gap-3 lg:grid-cols-2">
            <MockBriefCard />
            <MockTradesPair />
          </div>
        </DashboardFrame>
      </div>
      <PhaseDots phase={phase} onSelect={setPhase} reduce={reduce} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Browser frame — chrome on desktop, plain card on mobile. min-h locked
// so the frame footprint never moves between phases.
// ---------------------------------------------------------------------------

function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-emerald/[0.04] blur-3xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_120px_-40px_rgba(16,185,129,0.25),0_8px_32px_-12px_rgba(0,0,0,0.6)]">
        {/* Browser chrome — lg+ only. */}
        <div className="hidden items-center gap-2 border-b border-border bg-surface-elevated/60 px-4 py-2.5 lg:flex">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/70" />
            <span className="size-2.5 rounded-full bg-amber-500/70" />
            <span className="size-2.5 rounded-full bg-emerald/70" />
          </span>
          <span className="ml-3 inline-flex max-w-md flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-1 font-mono text-[11px] text-muted-foreground">
            <span className="text-emerald">●</span>
            ptsystem.ai/dashboard
          </span>
        </div>

        {/* Min-h on the body keeps the whole frame size-stable as
            phases swap content inside the AvenSection. */}
        <div className="min-h-[1080px] space-y-3 bg-background/60 p-4 sm:p-5 lg:min-h-[1180px]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard header strip.
// ---------------------------------------------------------------------------

function DashboardHeaderStrip() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2">
      <div className="flex items-center gap-2">
        <BrandLogo size={14} />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground">
          PT System
        </span>
        <span aria-hidden className="text-muted-foreground/60">
          ·
        </span>
        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald">
          <span className="relative inline-flex size-1.5">
            <span
              className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
              style={{ animationDuration: "2.4s" }}
            />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
          </span>
          Live
        </span>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald" />
        Member · VIP
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top row — BTC ticker wobble + animated Unrealized PnL.
// ---------------------------------------------------------------------------

function AnimatedTopRow({
  phase,
  reduce,
  paused,
}: {
  phase: Phase;
  reduce: boolean;
  paused: boolean;
}) {
  const btc = useBtcTicker({ paused: paused || reduce });
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <TopCard
        label="BTC.USDT.P"
        value={`$${btc.toLocaleString("en-US")}`}
        sub="Live · Binance Perpetual"
      />
      <UnrealizedPnlCard phase={phase} reduce={reduce} />
      <TopCard
        label="Realized PnL"
        value="+$8,420"
        sub="Win-Rate 75% · 84 closed"
        valueTone="text-emerald"
      />
    </div>
  );
}

function TopCard({
  label,
  value,
  sub,
  valueTone,
  subTone,
}: {
  label: string;
  value: React.ReactNode;
  sub: React.ReactNode;
  valueTone?: string;
  subTone?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-lg font-semibold ${
          valueTone ?? "text-foreground"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-0.5 font-mono text-[10px] ${
          subTone ?? "text-muted-foreground"
        }`}
      >
        {sub}
      </p>
    </div>
  );
}

function UnrealizedPnlCard({
  phase,
  reduce,
}: {
  phase: Phase;
  reduce: boolean;
}) {
  const usd = useMotionValue(320);
  const pct = useMotionValue(1.2);
  const usdLabel = useTransform(usd, (v) => formatSignedUsd(v));
  const pctLabel = useTransform(pct, (v) => formatSignedPct(v));

  useEffect(() => {
    if (reduce) return;
    const targetUsd = phase === "discipline" ? -120 : 320;
    const targetPct = phase === "discipline" ? -2.4 : 1.2;
    // Slower than round-27 — 2s instead of 1.6 — so the ticker
    // reads as "value drifting" rather than "value snapping".
    const c1 = animate(usd, targetUsd, { duration: 2.0, ease: "easeInOut" });
    const c2 = animate(pct, targetPct, { duration: 2.0, ease: "easeInOut" });
    return () => {
      c1.stop();
      c2.stop();
    };
  }, [phase, reduce, usd, pct]);

  const negative = phase === "discipline";
  const tone = negative ? "text-red-300" : "text-emerald";

  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        Unrealized PnL
      </p>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <motion.span
          className={`font-mono text-lg font-semibold ${tone} transition-colors duration-700`}
        >
          {usdLabel}
        </motion.span>
        <motion.span
          className={`font-mono text-xs font-semibold ${tone} transition-colors duration-700`}
        >
          {pctLabel}
        </motion.span>
      </div>
      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
        1 open · BTCUSDT
      </p>
    </div>
  );
}

function useBtcTicker({ paused }: { paused: boolean }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (paused) return;
    // Round-28: was 1.5s — too jittery. Now one micro-pulse every
    // 3.5s so the price reads as alive but not nervous.
    const id = setInterval(() => setIdx((i) => i + 1), 3500);
    return () => clearInterval(id);
  }, [paused]);
  const wobbles = [0, 5, -3, 8, -2, 1, -4, 6];
  return 76812 + wobbles[idx % wobbles.length];
}

function formatSignedUsd(v: number): string {
  const rounded = Math.round(v);
  if (rounded === 0) return "$0";
  const sign = rounded > 0 ? "+" : "−";
  return `${sign}$${Math.abs(rounded).toLocaleString("en-US")}`;
}

function formatSignedPct(v: number): string {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v).toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Aven section — fixed-height conversation viewport, marquee, input bar.
// ---------------------------------------------------------------------------

function AnimatedAvenSection({
  phase,
  reduce,
}: {
  phase: Phase;
  reduce: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-emerald/25 bg-gradient-to-br from-surface via-surface to-emerald/[0.04] shadow-[0_0_60px_-25px_rgba(16,185,129,0.35)]">
      <AvenLiveBarMarquee reduce={reduce} />
      <div className="border-t border-emerald/20" />

      {/* Fixed-height conversation viewport. Each phase's content is
          rendered absolutely inside this box so AnimatePresence can
          cross-fade old → new without the surrounding frame
          reflowing. Sized to comfortably hold the setup-phase chart
          plus both bubbles. */}
      <div className="relative h-[560px] overflow-hidden bg-background/40 lg:h-[640px]">
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 0.4, duration: 0.6, ease: EASE_IN_OUT },
              }}
              exit={{ opacity: 0, transition: { duration: 0.6, ease: EASE_IN_OUT } }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:px-5 sm:py-8"
            >
              <span className="inline-flex size-12 items-center justify-center rounded-full border border-emerald/25 bg-emerald/[0.06]">
                <span className="size-2 rounded-full bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Aven is listening
              </p>
              <p className="max-w-sm text-sm text-muted-foreground/80">
                Ask anything. Setup checks, mid-trade reviews, market
                structure — Aven sees your trades and Paul&apos;s methodology.
              </p>
            </motion.div>
          )}

          {phase === "setup" && (
            <PhaseScroll key="setup">
              <SetupConversation reduce={reduce} />
            </PhaseScroll>
          )}

          {phase === "discipline" && (
            <PhaseScroll key="discipline">
              <DisciplineConversation />
            </PhaseScroll>
          )}
        </AnimatePresence>
      </div>

      <ChatInputBar />
    </section>
  );
}

// Wrapper used by setup + discipline phases — handles the absolute
// positioning, scroll behaviour, and shared enter/exit transition.
function PhaseScroll({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: 0.4, duration: 0.6, ease: EASE_IN_OUT },
      }}
      exit={{ opacity: 0, transition: { duration: 0.6, ease: EASE_IN_OUT } }}
      className="absolute inset-0 overflow-y-auto px-4 py-5 sm:px-5 sm:py-6"
    >
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// AvenLiveBar marquee.
// ---------------------------------------------------------------------------

const LANDING_THOUGHTS: ReadonlyArray<string> = [
  "Watching BTC 4H bull-cross",
  "Tracking funding rate flow",
  "Monitoring liquidity layers",
  "Setup detection running",
  "Analyzing 4H market structure",
  "Scanning EMA-200 reactions",
];

function AvenLiveBarMarquee({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="relative inline-flex size-6 items-center justify-center rounded-full bg-emerald/[0.18] ring-2 ring-emerald/40">
          <span className="size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.65)]" />
        </span>
        <div className="leading-tight">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald/85">
            AI Mentor
          </p>
          <p className="text-[14px] font-semibold tracking-tight text-foreground">
            Aven
          </p>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden">
        <div className="inline-flex max-w-full items-center gap-2.5 text-[12px]">
          <span
            aria-hidden
            className="inline-flex size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.65)]"
          />
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald/75">
            Live
          </span>
          <div className="min-w-0 flex-1 overflow-hidden">
            {reduce ? (
              <span className="block truncate italic text-emerald-300/80">
                &ldquo;{LANDING_THOUGHTS[0]}&rdquo;
              </span>
            ) : (
              <div className="flex whitespace-nowrap aven-showcase-ticker">
                {LANDING_THOUGHTS.concat(LANDING_THOUGHTS).map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex shrink-0 items-baseline"
                    aria-hidden={i >= LANDING_THOUGHTS.length}
                  >
                    <span className="italic text-emerald-300/80">
                      &ldquo;{t}&rdquo;
                    </span>
                    <span aria-hidden className="px-3 text-muted-foreground/50">
                      ·
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <span aria-hidden className="h-0 w-0" />

      <style>{`
        @keyframes aven-showcase-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .aven-showcase-ticker {
          animation: aven-showcase-ticker 50s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .aven-showcase-ticker { animation: none; }
        }
      `}</style>
    </div>
  );
}

function ChatInputBar() {
  return (
    <div className="flex items-center gap-2 border-t border-border bg-surface-elevated/60 px-3 py-2.5 sm:px-4">
      <span className="inline-flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v14" />
          <path d="M8 6.5a4 4 0 1 1 8 0v6.5a4 4 0 1 1-8 0V6.5z" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M9 22h6" />
        </svg>
      </span>
      <div className="flex-1 rounded-full border border-border bg-background px-4 py-2 font-mono text-[11px] text-muted-foreground/70">
        Ask Aven anything…
      </div>
      <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald text-background">
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M13 6l6 6-6 6" />
        </svg>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversations — bubbles + (setup only) chart.
// ---------------------------------------------------------------------------

function SetupConversation({ reduce }: { reduce: boolean }) {
  const d = reduce
    ? { memberTyping: 0, memberMsg: 0, avenThinking: 0, avenMsg: 0, chartIn: 0 }
    : {
        memberTyping: 0.6,
        memberMsg: 2.2,
        avenThinking: 3.2,
        avenMsg: 5.0,
        chartIn: 6.8,
      };

  return (
    <>
      {!reduce && (
        <FadingTypingDots align="right" delay={d.memberTyping} duration={1.4} />
      )}
      <MemberBubble
        text="BTC bouncing off 78.5k — does the setup hold?"
        ts="09:42"
        delay={d.memberMsg}
      />
      {!reduce && (
        <FadingTypingDots align="left" delay={d.avenThinking} duration={1.6} />
      )}
      <AvenBubble
        score={8}
        intro="Confluence: 3 sources (0.618 fib, EMA-200, ascending trendline). Score: 8/10."
        body="Counter: 1H RSI at 68 — wait for pullback to 0.5 fib before entry."
        ts="09:43"
        delay={d.avenMsg}
      />
      <AnimatedChart delay={d.chartIn} reduce={reduce} />
    </>
  );
}

function DisciplineConversation() {
  return (
    <>
      <FadingTypingDots align="right" delay={2.4} duration={1.2} />
      <MemberBubble
        text="My long is down 2%, should I cut or hold?"
        ts="14:08"
        delay={3.6}
      />
      <FadingTypingDots align="left" delay={4.6} duration={1.6} />
      <AvenBubble
        intro="Entry was solid — 8/10 setup. SL at $74,500 still valid (12% from current). RSI 1H at 32 — historical bounce zone."
        body="The thesis hasn't broken. Discipline check: are you reacting to price or to your plan?"
        ts="14:09"
        delay={6.2}
      />
    </>
  );
}

function MemberBubble({
  text,
  ts,
  delay,
}: {
  text: string;
  ts: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald/[0.12] px-4 py-2.5 text-[14px] leading-relaxed text-foreground">
          {text}
        </div>
      </div>
      <div className="mt-1 flex justify-end px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        you · {ts}
      </div>
    </motion.div>
  );
}

function AvenBubble({
  score,
  intro,
  body,
  ts,
  delay,
}: {
  score?: number;
  intro: string;
  body: string;
  ts: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald/[0.18] ring-2 ring-emerald/40">
          <span className="size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.65)]" />
        </span>
        <div className="max-w-[85%]">
          <div className="rounded-2xl rounded-tl-sm bg-surface-elevated px-4 py-3 text-[14px] leading-relaxed text-foreground">
            {score !== undefined && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.08] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald">
                Setup score · {score}/10
              </span>
            )}
            <p>{intro}</p>
            <p className="mt-2 text-foreground/90">{body}</p>
          </div>
          <div className="mt-1 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Aven · {ts}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FadingTypingDots({
  align,
  delay,
  duration,
}: {
  align: "left" | "right";
  delay: number;
  duration: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = setTimeout(() => setVisible(true), delay * 1000);
    const hide = setTimeout(
      () => setVisible(false),
      (delay + duration) * 1000,
    );
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [delay, duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.5, ease: EASE_IN_OUT }}
          className={
            align === "right" ? "flex justify-end" : "flex items-start gap-3"
          }
        >
          {align === "left" && (
            <span className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald/[0.18] ring-2 ring-emerald/40">
              <span className="size-1.5 rounded-full bg-emerald" />
            </span>
          )}
          <div
            className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 ${
              align === "right"
                ? "rounded-tr-sm bg-emerald/[0.10]"
                : "rounded-tl-sm bg-surface-elevated"
            }`}
            aria-label={align === "right" ? "Typing" : "Aven is thinking"}
          >
            <TypingDot delay="0s" />
            <TypingDot delay="0.18s" />
            <TypingDot delay="0.36s" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 animate-bounce rounded-full bg-emerald/70"
      style={{ animationDelay: delay, animationDuration: "1.6s" }}
    />
  );
}

// ---------------------------------------------------------------------------
// AnimatedChart — TradingView-style. 40 candles, right-side Y-axis with
// price labels, X-axis time labels, dotted grid, volume sub-chart, fib
// levels with prices + Golden-Pocket emphasis, ENTRY ZONE annotation,
// chart-header bar + watermark. All elements draw sequentially.
// ---------------------------------------------------------------------------

const CHART = {
  vbW: 800,
  vbH: 320,
  // Main chart area
  cxStart: 32,
  cxEnd: 700,
  cyTop: 36,
  cyBottom: 232,
  // Volume sub-chart
  vyTop: 254,
  vyBottom: 290,
  // Y axis labels (right side)
  yAxisX: 710,
  // X axis labels
  xAxisY: 304,
  // Price scale
  priceHi: 79500,
  priceLo: 73500,
};

function priceToY(p: number): number {
  const t = (CHART.priceHi - p) / (CHART.priceHi - CHART.priceLo);
  return CHART.cyTop + t * (CHART.cyBottom - CHART.cyTop);
}

// 40 close-prices — a uptrend that pushes to 79,000, retraces to the
// 0.618 Golden Pocket at 77,200, then bounces. Hand-tuned.
const CLOSES: ReadonlyArray<number> = [
  77500, 77620, 77400, 77550, 77720, 77900, 78060, 77950, 78180, 78320,
  78240, 78420, 78550, 78720, 78640, 78870, 79050, 79150, 79080, 78990,
  78840, 78700, 78540, 78360, 78190, 78030, 77860, 77690, 77530, 77380,
  77260, 77200, 77260, 77210, 77340, 77460, 77580, 77470, 77520, 77410,
];

// Deterministic wick variance — different per index but reproducible.
function wick(i: number, salt: number): number {
  const h = Math.abs(Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453);
  return (h % 1) * 70 + 20;
}

function buildCandles() {
  return CLOSES.map((close, i) => {
    const open = i === 0 ? 77500 : CLOSES[i - 1];
    const bull = close >= open;
    const high = Math.max(open, close) + wick(i, 1);
    const low = Math.min(open, close) - wick(i, 2);
    return { open, close, high, low, bull, idx: i };
  });
}

// 5 fib levels — drawn from the swing low (76,400 / 0.786) to swing
// high (79,200 / 0.236). 0.618 is the Golden Pocket, emerald-highlit.
const FIBS = [
  { fib: "0.236", price: 79200, color: "#94a3b8", emphasis: false },
  { fib: "0.382", price: 78400, color: "#94a3b8", emphasis: false },
  { fib: "0.500", price: 77800, color: "#94a3b8", emphasis: false },
  { fib: "0.618", price: 77200, color: "#34d399", emphasis: true, gp: true },
  { fib: "0.786", price: 76400, color: "#fbbf24", emphasis: false },
] as const;

const Y_LABELS = [79500, 78000, 76500, 75000, 73500];
const X_LABELS = [
  { x: 80, label: "14:00" },
  { x: 220, label: "16:00" },
  { x: 360, label: "18:00" },
  { x: 500, label: "20:00" },
  { x: 640, label: "22:00" },
];

function AnimatedChart({
  delay,
  reduce,
}: {
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
      className="ml-9"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-[0_0_40px_-20px_rgba(16,185,129,0.35)]">
        <ChartSvg reduce={reduce} />
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Aven sends you the annotated chart.
      </p>
    </motion.div>
  );
}

function ChartSvg({ reduce }: { reduce: boolean }) {
  const candles = buildCandles();
  const candleStride =
    (CHART.cxEnd - CHART.cxStart) / candles.length;
  const candleW = candleStride * 0.62;
  // Volume scaling — bigger when the body is bigger.
  const volMax = Math.max(
    ...candles.map((c) => Math.abs(c.close - c.open)),
  );
  const volH = CHART.vyBottom - CHART.vyTop;

  // Trendline anchor — from the swing low's bottom area up to the
  // current candle's body.
  const trendStart = { x: 60, y: priceToY(74600) };
  const trendEnd = { x: 660, y: priceToY(77100) };

  // Entry zone — emerald box around the 0.618 GP level.
  const gpY = priceToY(77200);
  const entryZone = {
    x: 470,
    y: gpY - 14,
    w: 210,
    h: 26,
  };

  return (
    <svg
      viewBox={`0 0 ${CHART.vbW} ${CHART.vbH}`}
      className="block w-full"
      role="img"
      aria-label="BTC.USDT.P 4H chart with Fibonacci levels and entry zone"
    >
      <defs>
        <linearGradient id="ds-chart-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1014" />
          <stop offset="100%" stopColor="#060a0e" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width={CHART.vbW}
        height={CHART.vbH}
        fill="url(#ds-chart-bg)"
      />

      {/* Chart header — top-left */}
      <text
        x="14"
        y="18"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        fill="#e5e7eb"
        fontWeight="600"
      >
        BTC.USDT.P
      </text>
      <text
        x="100"
        y="18"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fill="#94a3b8"
      >
        · 4H · Binance
      </text>
      <text
        x="220"
        y="18"
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        fill="#94a3b8"
      >
        O <tspan fill="#e5e7eb">77,500</tspan>{"  "}
        H <tspan fill="#e5e7eb">79,200</tspan>{"  "}
        L <tspan fill="#e5e7eb">77,200</tspan>{"  "}
        C <tspan fill="#34d399">77,410</tspan>
      </text>

      {/* Watermark — bottom right */}
      <text
        x={CHART.vbW - 10}
        y={CHART.vbH - 8}
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        fill="#475569"
        opacity="0.6"
        textAnchor="end"
      >
        ptsystem.ai
      </text>

      {/* Horizontal gridlines — every $1,500 */}
      {Y_LABELS.map((p) => (
        <line
          key={`grid-${p}`}
          x1={CHART.cxStart}
          y1={priceToY(p)}
          x2={CHART.cxEnd}
          y2={priceToY(p)}
          stroke="#1f2937"
          strokeWidth="0.5"
          strokeDasharray="2 3"
          opacity="0.55"
        />
      ))}

      {/* Right Y-axis price labels */}
      {Y_LABELS.map((p) => (
        <text
          key={`y-${p}`}
          x={CHART.yAxisX}
          y={priceToY(p) + 3}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#94a3b8"
        >
          ${p.toLocaleString("en-US")}
        </text>
      ))}

      {/* Candles — stagger fade-in left → right */}
      {candles.map((c) => {
        const x = CHART.cxStart + c.idx * candleStride + candleStride / 2;
        const top = Math.min(c.open, c.close);
        const bottom = Math.max(c.open, c.close);
        const color = c.bull ? "#34d399" : "#f87171";
        const candleDelay = reduce ? 0 : 0.02 * c.idx;
        return (
          <motion.g
            key={`c-${c.idx}`}
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: candleDelay,
              ease: EASE_OUT,
            }}
          >
            <line
              x1={x}
              y1={priceToY(c.high)}
              x2={x}
              y2={priceToY(c.low)}
              stroke={color}
              strokeWidth="1.1"
              opacity="0.9"
            />
            <rect
              x={x - candleW / 2}
              y={priceToY(bottom)}
              width={candleW}
              height={Math.max(1.5, priceToY(top) - priceToY(bottom))}
              fill={color}
              opacity="0.92"
            />
          </motion.g>
        );
      })}

      {/* Volume bars */}
      {candles.map((c) => {
        const x = CHART.cxStart + c.idx * candleStride + candleStride / 2;
        const intensity = Math.abs(c.close - c.open) / Math.max(1, volMax);
        const h = Math.max(2, intensity * volH * 0.9);
        const color = c.bull ? "#34d399" : "#f87171";
        const vDelay = reduce ? 0 : 0.02 * c.idx;
        return (
          <motion.rect
            key={`v-${c.idx}`}
            x={x - candleW / 2}
            y={CHART.vyBottom - h}
            width={candleW}
            height={h}
            fill={color}
            opacity="0.35"
            initial={reduce ? { opacity: 0.35 } : { opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{
              duration: 0.3,
              delay: vDelay,
              ease: EASE_OUT,
            }}
          />
        );
      })}

      {/* X-axis time labels */}
      {X_LABELS.map((t) => (
        <text
          key={`x-${t.label}`}
          x={t.x}
          y={CHART.xAxisY}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#94a3b8"
          textAnchor="middle"
        >
          {t.label}
        </text>
      ))}

      {/* Fib level lines — stroke in with pathLength after candles */}
      {FIBS.map((f, i) => {
        const y = priceToY(f.price);
        const lineDelay = reduce ? 0 : 1.0 + i * 0.18;
        return (
          <motion.g
            key={`fib-${f.fib}`}
            initial={reduce ? { opacity: 1 } : { opacity: 1 }}
          >
            <motion.path
              d={`M ${CHART.cxStart} ${y} L ${CHART.cxEnd} ${y}`}
              stroke={f.color}
              strokeWidth={f.emphasis ? 1.4 : 1}
              strokeDasharray={f.emphasis ? "" : "4 4"}
              fill="none"
              opacity={f.emphasis ? 0.85 : 0.35}
              initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{
                duration: reduce ? 0 : 0.7,
                delay: lineDelay,
                ease: EASE_OUT,
              }}
            />
            {/* Right-side fib label: "0.618 GP $77,200" */}
            <motion.text
              x={CHART.yAxisX + 30}
              y={y + 3}
              fontSize="9"
              fontFamily="ui-monospace, monospace"
              fill={f.color}
              opacity={f.emphasis ? 0.95 : 0.55}
              initial={reduce ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: f.emphasis ? 0.95 : 0.55 }}
              transition={{
                duration: 0.3,
                delay: reduce ? 0 : lineDelay + 0.25,
              }}
            >
              {f.fib}
              {f.emphasis ? " GP " : "  "}${f.price.toLocaleString("en-US")}
            </motion.text>
          </motion.g>
        );
      })}

      {/* Ascending trendline */}
      <motion.path
        d={`M ${trendStart.x} ${trendStart.y} L ${trendEnd.x} ${trendEnd.y}`}
        stroke="#34d399"
        strokeWidth="1.4"
        fill="none"
        opacity="0.7"
        initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: reduce ? 0 : 0.7,
          delay: reduce ? 0 : 1.95,
          ease: EASE_OUT,
        }}
      />

      {/* ENTRY ZONE — final reveal, pulsing emerald */}
      <motion.rect
        x={entryZone.x}
        y={entryZone.y}
        width={entryZone.w}
        height={entryZone.h}
        fill="#34d399"
        initial={reduce ? { opacity: 0.16 } : { opacity: 0 }}
        animate={
          reduce
            ? { opacity: 0.16 }
            : { opacity: [0, 0.24, 0.14, 0.22, 0.16] }
        }
        transition={{
          duration: reduce ? 0 : 1.6,
          delay: reduce ? 0 : 2.6,
          ease: EASE_OUT,
        }}
      />
      <motion.text
        x={entryZone.x + 6}
        y={entryZone.y - 4}
        fontSize="9"
        fontFamily="ui-monospace, monospace"
        fill="#34d399"
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : 2.85 }}
      >
        ENTRY ZONE
      </motion.text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Phase dots.
// ---------------------------------------------------------------------------

function PhaseDots({
  phase,
  onSelect,
  reduce,
}: {
  phase: Phase;
  onSelect: (p: Phase) => void;
  reduce: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Showcase phase"
      className="mt-5 flex items-center justify-center gap-2"
    >
      {PHASE_ORDER.map((p) => {
        const active = p === phase;
        return (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={PHASE_LABELS[p]}
            onClick={() => onSelect(p)}
            disabled={reduce}
            className={[
              "h-1.5 rounded-full transition-all duration-500",
              active
                ? "w-7 bg-emerald"
                : "w-1.5 bg-border hover:bg-muted-foreground/40",
              reduce ? "cursor-default opacity-60" : "cursor-pointer",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Caption bullets.
// ---------------------------------------------------------------------------

function CaptionBullets() {
  return (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-center sm:gap-5">
      <CaptionBullet emoji="🌅">
        Daily briefings, analyzed across five timeframes
      </CaptionBullet>
      <Separator />
      <CaptionBullet emoji="💬">
        Setup scores with confluence reasoning + annotated charts
      </CaptionBullet>
      <Separator />
      <CaptionBullet emoji="🎯">
        Mid-trade discipline reminders, in your trader&apos;s voice
      </CaptionBullet>
    </div>
  );
}

function CaptionBullet({
  emoji,
  children,
}: {
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <p className="inline-flex items-center gap-2 text-sm leading-relaxed text-muted-foreground sm:max-w-[18ch] sm:text-[15px]">
      <span aria-hidden className="text-base">
        {emoji}
      </span>
      <span>{children}</span>
    </p>
  );
}

function Separator() {
  return (
    <span aria-hidden className="hidden text-muted-foreground/40 sm:inline">
      ·
    </span>
  );
}

// ---------------------------------------------------------------------------
// Brief card mock — now with the 5-timeframe pill row.
// ---------------------------------------------------------------------------

const TIMEFRAMES: ReadonlyArray<string> = ["Daily", "4H", "1H", "30m", "15m"];

function MockBriefCard() {
  return (
    <div className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] p-4">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/30 bg-amber-500/[0.08]">
          <span className="text-sm" aria-hidden>
            🌅
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-foreground">
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              BTC
            </span>
            <span>Morning Briefing</span>
          </h3>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            18.05.2026 · Spot{" "}
            <span className="text-foreground">$76,812</span>
          </p>

          {/* Timeframe analysis row — signals depth without the brief
              needing to be expanded. */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {TIMEFRAMES.map((tf) => (
              <span
                key={tf}
                className="inline-flex items-center gap-1 rounded-full border border-emerald/25 bg-emerald/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald/90"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  width="9"
                  height="9"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {tf}
              </span>
            ))}
          </div>
          <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Analyzed across 5 timeframes
          </p>

          <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            🎯 Overall picture &amp; setup
          </p>
          <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-foreground/90">
            Bullish — Daily and 4H structurally aligned, higher highs
            established. Long setup on Daily 0.618 pullback with SL
            below ascending TL.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trades pair — Your trades + Paul's trades side by side.
// ---------------------------------------------------------------------------

function MockTradesPair() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TradesCard
        eyebrow="Your trades"
        subtitle="1 open · 8 closed"
        winRate="62%"
        rows={[
          { num: "#9", sym: "BTCUSDT", side: "long", lev: "5x", pct: "+3.34%", pos: true },
          { num: "#8", sym: "ETHUSDT", side: "short", lev: "10x", pct: "−1.10%", pos: false },
          { num: "#7", sym: "BTCUSDT", side: "long", lev: "8x", pct: "+5.20%", pos: true },
          { num: "#6", sym: "SOLUSDT", side: "short", lev: "3x", pct: "+0.85%", pos: true },
          { num: "#5", sym: "ETHUSDT", side: "long", lev: "5x", pct: "−2.30%", pos: false },
        ]}
      />
      <TradesCard
        eyebrow="Paul's trades"
        subtitle="Following Paul"
        winRate="75%"
        rows={[
          { num: "#84", sym: "BTCUSDT", side: "short", lev: "20x", pct: "+9.61%", pos: true },
          { num: "#83", sym: "ETHUSDT", side: "long", lev: "10x", pct: "+4.20%", pos: true },
          { num: "#82", sym: "SOLUSDT", side: "long", lev: "5x", pct: "−1.85%", pos: false },
          { num: "#81", sym: "BTCUSDT", side: "long", lev: "15x", pct: "+11.30%", pos: true },
          { num: "#80", sym: "ETHUSDT", side: "short", lev: "8x", pct: "+3.05%", pos: true },
        ]}
      />
    </div>
  );
}

function TradesCard({
  eyebrow,
  subtitle,
  winRate,
  rows,
}: {
  eyebrow: string;
  subtitle: string;
  winRate: string;
  rows: ReadonlyArray<{
    num: string;
    sym: string;
    side: "long" | "short";
    lev: string;
    pct: string;
    pos: boolean;
  }>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
            {eyebrow}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/[0.08] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
          Win-rate · {winRate}
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <TradeRow key={r.num} {...r} />
        ))}
      </ul>
    </div>
  );
}

function TradeRow({
  num,
  sym,
  side,
  lev,
  pct,
  pos,
}: {
  num: string;
  sym: string;
  side: "long" | "short";
  lev: string;
  pct: string;
  pos: boolean;
}) {
  const tone = pos ? "text-emerald" : "text-red-300";
  const sideTone =
    side === "long"
      ? "bg-emerald/[0.10] text-emerald"
      : "bg-red-500/10 text-red-300";
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-sm">
      <span className="font-mono text-[10px] text-muted-foreground">{num}</span>
      <span className="font-mono text-[12px] font-medium text-foreground">
        {sym}
      </span>
      <span
        className={`inline-flex rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase ${sideTone}`}
      >
        {side} · {lev}
      </span>
      <span
        className={`ml-auto whitespace-nowrap font-mono text-[12px] font-semibold ${tone}`}
      >
        {pct}
      </span>
    </li>
  );
}
