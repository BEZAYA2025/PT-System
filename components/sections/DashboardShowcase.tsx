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

// Landing-page Section #3 — "Dashboard + Aven Showcase".
//
// Replaces the previous 4-scenario slideshow with a single animated
// dashboard mockup that LOOPS through three phases — idle, setup
// question, mid-trade discipline — using the same conversation +
// chart-drawing beats members see in the real product.
//
// The mockup is a static replica of the live dashboard surfaces; only
// the chat section, the Unrealized-PnL value, the BTC ticker and the
// AvenLiveBar marquee animate. Everything else is hand-tuned demo
// content. Reduced-motion users get the setup phase frozen at its
// end-state (chart fully drawn, conversation in place) — the most
// representative single frame.

type Phase = "idle" | "setup" | "discipline";

const PHASE_ORDER: ReadonlyArray<Phase> = ["idle", "setup", "discipline"];

// Tuned so the full story fits in ~32s. Long enough to read, short
// enough to keep moving.
const PHASE_DURATION_MS: Record<Phase, number> = {
  idle: 5000,
  setup: 16000,
  discipline: 11000,
};

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
// Story phase state machine. Advances on a timer; hover pauses it; clicks
// on the phase dots jump directly.
// ---------------------------------------------------------------------------

function useStoryPhase({
  paused,
  reduce,
}: {
  paused: boolean;
  reduce: boolean;
}) {
  // Reduced-motion users get a single static frame: the setup phase
  // (most representative — chart visible, conversation in place).
  const [phase, setPhase] = useState<Phase>(reduce ? "setup" : "idle");

  useEffect(() => {
    if (reduce) return;
    if (paused) return;
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
// Animated showcase — browser-frame on desktop, plain wrapper on mobile.
// Hover pauses the loop. Phase dots below the visual jump between beats.
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
            <MockTradesStrip />
          </div>
        </DashboardFrame>
      </div>

      <PhaseDots phase={phase} onSelect={setPhase} reduce={reduce} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Browser frame — chrome on desktop, plain card on mobile.
// ---------------------------------------------------------------------------

function DashboardFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-emerald/[0.04] blur-3xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_120px_-40px_rgba(16,185,129,0.25),0_8px_32px_-12px_rgba(0,0,0,0.6)]">
        {/* Browser chrome — lg+ only (too cramped on mobile). */}
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
        <div className="space-y-3 bg-background/60 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard header strip — PT logo + LIVE badge + Member pill.
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
              style={{ animationDuration: "2s" }}
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
// Top row — three cards. BTC price has a subtle ticker wobble.
// Unrealized PnL animates between +$320 (idle/setup) and −$120 (discipline).
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
  // Two animated motion values — the $ amount and the % — both swing
  // between the positive idle/setup state and the negative discipline
  // state. Motion values bypass React re-renders so the ticker reads
  // smooth even at 60fps.
  const usd = useMotionValue(reduce ? 320 : 320);
  const pct = useMotionValue(reduce ? 1.2 : 1.2);
  const usdLabel = useTransform(usd, (v) => formatSignedUsd(v));
  const pctLabel = useTransform(pct, (v) => formatSignedPct(v));

  useEffect(() => {
    if (reduce) return;
    const targetUsd = phase === "discipline" ? -120 : 320;
    const targetPct = phase === "discipline" ? -2.4 : 1.2;
    const c1 = animate(usd, targetUsd, { duration: 1.6, ease: "easeOut" });
    const c2 = animate(pct, targetPct, { duration: 1.6, ease: "easeOut" });
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
          className={`font-mono text-lg font-semibold ${tone} transition-colors duration-500`}
        >
          {usdLabel}
        </motion.span>
        <motion.span
          className={`font-mono text-xs font-semibold ${tone} transition-colors duration-500`}
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
    const id = setInterval(() => setIdx((i) => i + 1), 1500);
    return () => clearInterval(id);
  }, [paused]);
  // Subtle wobble around 76,812 — a few-dollar swing every 1.5s.
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
// Aven section — the heart. AvenLiveBar marquee + conversation area +
// input bar. Conversation content is phase-driven.
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

      {/* Conversation area — switches content per phase. */}
      <div className="min-h-[260px] space-y-3 bg-background/40 px-4 py-5 sm:px-5 sm:py-6 lg:min-h-[300px]">
        <AnimatePresence mode="popLayout">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-full border border-emerald/25 bg-emerald/[0.06]">
                <span className="size-1.5 rounded-full bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
              </span>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Aven is listening
              </p>
            </motion.div>
          )}

          {phase === "setup" && (
            <SetupConversation key="setup" reduce={reduce} />
          )}

          {phase === "discipline" && (
            <DisciplineConversation key="discipline" />
          )}
        </AnimatePresence>
      </div>

      <ChatInputBar />
    </section>
  );
}

// ---------------------------------------------------------------------------
// AvenLiveBar with a real CSS marquee. Hardcoded thought list — looks
// alive without wiring up the SSE stream.
// ---------------------------------------------------------------------------

const LANDING_THOUGHTS: ReadonlyArray<string> = [
  "Watching BTC 4H bull-cross",
  "Tracking funding rate flow",
  "Monitoring liquidity layers",
  "Setup detection running",
  "Analyzing 4H market structure",
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
          animation: aven-showcase-ticker 32s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .aven-showcase-ticker {
            animation: none;
          }
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
// Conversations — one per phase. Internal staggered delays so member
// types → message appears → Aven thinks → response → optional chart.
// ---------------------------------------------------------------------------

function SetupConversation({ reduce }: { reduce: boolean }) {
  // Reduced motion shows the end-state directly: everything visible at
  // once, no staggered delays.
  const d = reduce
    ? {
        memberTyping: 0,
        memberMsg: 0,
        avenThinking: 0,
        avenMsg: 0,
        chartIn: 0,
      }
    : {
        memberTyping: 0.4,
        memberMsg: 1.8,
        avenThinking: 2.6,
        avenMsg: 4.2,
        chartIn: 5.8,
      };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {!reduce && (
        <FadingTypingDots align="right" delay={d.memberTyping} duration={1.3} />
      )}
      <MemberBubble
        text="BTC bouncing off 78.5k — does the setup hold?"
        ts="09:42"
        delay={d.memberMsg}
      />
      {!reduce && (
        <FadingTypingDots align="left" delay={d.avenThinking} duration={1.5} />
      )}
      <AvenBubble
        score={8}
        intro="Confluence: 3 sources (0.618 fib, EMA-200, ascending trendline). Score: 8/10."
        body="Counter: 1H RSI at 68 — wait for pullback to 0.5 fib before entry."
        ts="09:43"
        delay={d.avenMsg}
      />
      <AnimatedChart delay={d.chartIn} reduce={reduce} />
    </motion.div>
  );
}

function DisciplineConversation() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Brief idle moment while the PnL card tickers; bubbles slide in
          after that. Delays are smaller than the setup phase since this
          beat is shorter overall. */}
      <FadingTypingDots align="right" delay={1.8} duration={1.1} />
      <MemberBubble
        text="My long is down 2%, should I cut or hold?"
        ts="14:08"
        delay={3.0}
      />
      <FadingTypingDots align="left" delay={3.8} duration={1.5} />
      <AvenBubble
        intro="Entry was solid — 8/10 setup. SL at $74,500 still valid (12% from current). RSI 1H at 32 — historical bounce zone."
        body="The thesis hasn't broken. Discipline check: are you reacting to price or to your plan?"
        ts="14:09"
        delay={5.4}
      />
    </motion.div>
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
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
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
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
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

// Briefly-visible typing indicator. Auto-hides after `duration` seconds
// via internal exit-animate; consumer doesn't need to track its
// lifecycle. Used both for member-typing (right-aligned) and Aven-
// thinking (left-aligned with avatar) cues.
function FadingTypingDots({
  align,
  delay,
  duration,
}: {
  align: "left" | "right";
  delay: number;
  duration: number;
}) {
  // Show for `duration` seconds starting at `delay`, then unmount.
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
          transition={{ duration: 0.3 }}
          className={align === "right" ? "flex justify-end" : "flex items-start gap-3"}
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
            <TypingDot delay="0.15s" />
            <TypingDot delay="0.3s" />
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
      style={{ animationDelay: delay, animationDuration: "1.2s" }}
    />
  );
}

// ---------------------------------------------------------------------------
// Animated chart — appears at the end of the setup conversation. Each
// element draws sequentially via Framer Motion's pathLength on lines
// and staggered opacity on the candles, finishing with an emerald
// pulse on the ENTRY ZONE annotation.
// ---------------------------------------------------------------------------

function AnimatedChart({
  delay,
  reduce,
}: {
  delay: number;
  reduce: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="ml-9 max-w-[85%]"
    >
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <ChartSvg reduce={reduce} />
      </div>
      <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Aven sends you the annotated chart.
      </p>
    </motion.div>
  );
}

function ChartSvg({ reduce }: { reduce: boolean }) {
  // Each child's `transition.delay` is relative to this SVG's mount —
  // the parent wrapper's `delay` controls when this whole element
  // arrives, so the effective on-screen times are:
  //   candles    0-1s (staggered fade)
  //   fib lines  1-2s (pathLength + text)
  //   trendline  2-2.5s
  //   entry zone 2.5-3.5s (pulse + label)
  const candles: ReadonlyArray<{
    x: number;
    o: number;
    c: number;
    h: number;
    l: number;
    bull: boolean;
  }> = [
    { x: 90, o: 200, c: 170, h: 162, l: 210, bull: true },
    { x: 120, o: 170, c: 180, h: 162, l: 188, bull: false },
    { x: 150, o: 180, c: 155, h: 150, l: 188, bull: true },
    { x: 180, o: 155, c: 165, h: 148, l: 172, bull: false },
    { x: 210, o: 165, c: 140, h: 132, l: 172, bull: true },
    { x: 240, o: 140, c: 150, h: 132, l: 158, bull: false },
    { x: 270, o: 150, c: 120, h: 112, l: 158, bull: true },
    { x: 300, o: 120, c: 135, h: 112, l: 142, bull: false },
    { x: 330, o: 135, c: 110, h: 100, l: 142, bull: true },
    { x: 360, o: 110, c: 125, h: 100, l: 132, bull: false },
    { x: 390, o: 125, c: 95, h: 86, l: 132, bull: true },
    { x: 420, o: 95, c: 108, h: 86, l: 116, bull: false },
    { x: 450, o: 108, c: 85, h: 75, l: 116, bull: true },
  ];

  const fibLines: ReadonlyArray<{
    y: number;
    label: string;
    color: string;
    emphasis: boolean;
  }> = [
    { y: 60, label: "0.786", color: "#fbbf24", emphasis: false },
    { y: 100, label: "0.618", color: "#34d399", emphasis: true },
    { y: 140, label: "0.500", color: "#94a3b8", emphasis: false },
    { y: 180, label: "0.382", color: "#94a3b8", emphasis: false },
    { y: 220, label: "0.236", color: "#94a3b8", emphasis: false },
  ];

  // Final-state values used when reduce-motion is on (no animation).
  const candleAnim = reduce
    ? { opacity: 1 }
    : { opacity: 1, transition: undefined };
  const lineAnim = reduce
    ? { pathLength: 1, opacity: 1 }
    : { pathLength: 1, opacity: 1 };

  return (
    <svg
      viewBox="0 0 600 260"
      className="block w-full"
      role="img"
      aria-label="Annotated BTC chart with Fibonacci levels and an ascending trendline"
    >
      <defs>
        <linearGradient id="chart-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0a0f14" />
          <stop offset="100%" stopColor="#060a0e" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="600" height="260" fill="url(#chart-bg)" />

      {/* Candles — fade in left → right. */}
      {candles.map((c, i) => {
        const top = Math.min(c.o, c.c);
        const bottom = Math.max(c.o, c.c);
        const color = c.bull ? "#34d399" : "#f87171";
        const delay = reduce ? 0 : i * 0.06;
        return (
          <motion.g
            key={c.x}
            initial={reduce ? candleAnim : { opacity: 0 }}
            animate={candleAnim}
            transition={{ duration: 0.25, delay }}
          >
            <line
              x1={c.x}
              y1={c.h}
              x2={c.x}
              y2={c.l}
              stroke={color}
              strokeWidth="1.2"
              opacity="0.9"
            />
            <rect
              x={c.x - 4}
              y={top}
              width="8"
              height={Math.max(2, bottom - top)}
              fill={color}
              opacity="0.9"
            />
          </motion.g>
        );
      })}

      {/* Fibonacci levels — draw left → right with pathLength. The 0.618
          line (emerald) is the load-bearing one; rendered last so it
          lands at the moment the ENTRY ZONE annotation fires. */}
      {fibLines.map((f, i) => (
        <motion.g
          key={f.label}
          initial={reduce ? { opacity: 1 } : { opacity: 1 }}
        >
          <motion.path
            d={`M 30 ${f.y} L 570 ${f.y}`}
            stroke={f.color}
            strokeWidth="1"
            strokeDasharray="4 4"
            fill="none"
            initial={reduce ? lineAnim : { pathLength: 0, opacity: 0.7 }}
            animate={lineAnim}
            opacity={f.emphasis ? 0.85 : 0.35}
            transition={{
              duration: reduce ? 0 : 0.6,
              delay: reduce ? 0 : 1.1 + i * 0.18,
              ease: "easeOut",
            }}
          />
          <motion.text
            x="572"
            y={f.y + 3}
            fontSize="9"
            fill={f.color}
            fontFamily="ui-monospace, monospace"
            opacity={f.emphasis ? 0.95 : 0.5}
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: f.emphasis ? 0.95 : 0.5 }}
            transition={{
              duration: 0.3,
              delay: reduce ? 0 : 1.4 + i * 0.18,
            }}
          >
            {f.label}
          </motion.text>
        </motion.g>
      ))}

      {/* Ascending trendline. */}
      <motion.path
        d="M 60 240 L 540 110"
        stroke="#34d399"
        strokeWidth="1.4"
        fill="none"
        opacity="0.75"
        initial={reduce ? lineAnim : { pathLength: 0 }}
        animate={lineAnim}
        transition={{
          duration: reduce ? 0 : 0.6,
          delay: reduce ? 0 : 2.2,
          ease: "easeOut",
        }}
      />

      {/* ENTRY ZONE — final reveal, with emerald pulse via opacity
          oscillation after the rect appears. */}
      <motion.rect
        x="380"
        y="85"
        width="160"
        height="32"
        fill="#34d399"
        initial={reduce ? { opacity: 0.18 } : { opacity: 0 }}
        animate={
          reduce
            ? { opacity: 0.18 }
            : { opacity: [0, 0.22, 0.12, 0.22, 0.18] }
        }
        transition={{
          duration: reduce ? 0 : 1.4,
          delay: reduce ? 0 : 2.8,
          ease: "easeOut",
        }}
      />
      <motion.text
        x="385"
        y="78"
        fontSize="9"
        fill="#34d399"
        fontFamily="ui-monospace, monospace"
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: reduce ? 0 : 3.0 }}
      >
        ENTRY ZONE
      </motion.text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Phase dots — click to jump.
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<Phase, string> = {
  idle: "Live dashboard",
  setup: "Setup conversation",
  discipline: "Mid-trade discipline",
};

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
              "h-1.5 rounded-full transition-all",
              active ? "w-7 bg-emerald" : "w-1.5 bg-border hover:bg-muted-foreground/40",
              reduce ? "cursor-default opacity-60" : "cursor-pointer",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Caption bullets — three short pillars under the visual.
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
// Static mocks reused as background context in the dashboard frame.
// ---------------------------------------------------------------------------

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

function MockTradesStrip() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
        Paul&apos;s trades
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Win-rate 75% · 84 closed
      </p>
      <ul className="mt-3 space-y-1.5">
        <TradeRow num="#84" sym="BTCUSDT" side="short" lev="20x" pct="+9.61%" pos />
        <TradeRow num="#83" sym="ETHUSDT" side="long" lev="10x" pct="+4.20%" pos />
        <TradeRow num="#82" sym="SOLUSDT" side="long" lev="5x" pct="−1.85%" pos={false} />
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
      <span className={`ml-auto font-mono text-[12px] font-semibold ${tone}`}>
        {pct}
      </span>
    </li>
  );
}

