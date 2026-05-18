"use client";

import { Reveal } from "@/components/Reveal";

// Landing-page Section #3 — "Dashboard + Aven Showcase".
//
// Replaces the older "MeetAven" section between WhatIs ("Not another
// trading bot.") and HowItWorks ("How PT System works"). The hook is
// the product itself, not Paul — visitors see the surfaces members
// actually use every day.
//
// All mockups are inline static replicas of the live dashboard
// components (DailyBriefCard, AvenLiveBar, AvenChat bubbles, the
// top-cards, the Paul's-Trades grid). Keeping them inline as static
// JSX rather than reusing the real components avoids the polling,
// SSR-hydration mismatches, and state plumbing those components need
// to function in-app — and lets us hand-pick demo content that
// reads well in a marketing context. Visual style matches the real
// surfaces token-for-token; when the product evolves, we refresh
// these by eye.

export function DashboardShowcase() {
  return (
    <section
      id="dashboard-showcase"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Your trading mentor. In one dashboard.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            See what members see — every day.
          </p>
        </Reveal>

        <div className="mt-20 space-y-24 sm:mt-24 sm:space-y-32">
          <ScenarioMorningRoutine />
          <ScenarioAskAven />
          <ScenarioMidTradeDiscipline />
          <ScenarioLearnFromPaul />
        </div>

        <Closer />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Scenario shell — alternating mockup/text columns. Mobile stacks
// mockup first then text; lg+ swaps to side-by-side, reversed by the
// `flip` prop for the even-numbered scenarios.
// ---------------------------------------------------------------------------

function Scenario({
  flip = false,
  mockup,
  children,
}: {
  flip?: boolean;
  mockup: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Reveal>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className={flip ? "lg:order-2" : ""}>{mockup}</div>
        <div className={flip ? "lg:order-1" : ""}>{children}</div>
      </div>
    </Reveal>
  );
}

function ScenarioCopy({
  eyebrow,
  body,
}: {
  eyebrow: string;
  body: React.ReactNode;
}) {
  return (
    <div className="max-w-xl">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
        {eyebrow}
      </p>
      <blockquote className="mt-4 text-xl leading-[1.55] text-foreground sm:text-2xl sm:leading-[1.5]">
        {body}
      </blockquote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SCENARIO 1 — Your Morning Routine
// AvenLiveBar above DailyBriefCard, both populated with a believable
// daily-briefing snapshot.
// ---------------------------------------------------------------------------

function ScenarioMorningRoutine() {
  return (
    <Scenario
      mockup={
        <div className="space-y-3">
          <MockAvenLiveBar />
          <MockBriefCard />
        </div>
      }
    >
      <ScenarioCopy
        eyebrow="Your morning routine"
        body={
          <>
            7 AM. Open the dashboard. Today&apos;s brief is waiting —
            analyzed by Aven across five timeframes. Two minutes of
            reading, full clarity on the day.
          </>
        }
      />
    </Scenario>
  );
}

// ---------------------------------------------------------------------------
// SCENARIO 2 — Ask Aven Anything
// Two chat bubbles + a small annotated chart image Aven "sends back".
// ---------------------------------------------------------------------------

function ScenarioAskAven() {
  return (
    <Scenario
      flip
      mockup={
        <div className="rounded-2xl border border-emerald/25 bg-gradient-to-br from-surface via-surface to-emerald/[0.05] p-5 shadow-[0_0_80px_-30px_rgba(16,185,129,0.4)] sm:p-6">
          <MockChatBubbles
            user="BTC bouncing off 78.5k — does this setup hold?"
            avenIntro="Confluence: 3 sources (0.618 fib, EMA-200, asc trendline). Score: 8/10."
            avenBody="Counter: 1H RSI at 68 — wait for pullback to 0.5 fib before entry."
            score={8}
          />

          <div className="mt-4 overflow-hidden rounded-xl border border-border bg-background">
            <MockChartImage />
          </div>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Aven sends you the annotated chart.
          </p>
        </div>
      }
    >
      <ScenarioCopy
        eyebrow="Ask Aven anything"
        body={
          <>
            Ask Aven anything — about your trade, a setup, the market
            structure. Get answers with full context. Often with charts,
            always with reasoning.
          </>
        }
      />
    </Scenario>
  );
}

// ---------------------------------------------------------------------------
// SCENARIO 3 — Mid-Trade Discipline
// Top-Card showing a losing open trade beside a chat where Aven
// reframes the move against the original thesis.
// ---------------------------------------------------------------------------

function ScenarioMidTradeDiscipline() {
  return (
    <Scenario
      mockup={
        <div className="space-y-3">
          <MockUnrealizedPnlCard
            usd="−$120"
            pct="−2.40%"
            symbol="BTCUSDT"
            entry="$78,500"
            sl="$74,500"
            tp="$82,000"
            negative
          />
          <MockChatBubbles
            user="My long is down 2%, should I cut or hold?"
            avenIntro="Entry was solid — 8/10 setup. SL at $74,500 still valid (12% from current)."
            avenBody="RSI 1H at 32 — historical bounce zone. The thesis hasn't broken. Discipline check: are you reacting to price or to your plan?"
          />
        </div>
      }
    >
      <ScenarioCopy
        eyebrow="Mid-trade discipline"
        body={
          <>
            When emotions hit, Aven brings you back to the framework.
            Not a yes-man. A mentor that respects your method even when
            you&apos;re tempted to break it.
          </>
        }
      />
    </Scenario>
  );
}

// ---------------------------------------------------------------------------
// SCENARIO 4 — Learn From Paul
// Paul's-Trades card with a Win-Rate badge + recent closes.
// ---------------------------------------------------------------------------

function ScenarioLearnFromPaul() {
  return (
    <Scenario
      flip
      mockup={<MockPaulsTrades />}
    >
      <ScenarioCopy
        eyebrow="Learn from Paul"
        body={
          <>
            Every trade Paul opens is visible to members — entry, exit,
            ROI, the reasoning. Learn by watching a professional trade
            in real time, with his setup scores and exit logic shown.
            Not copying. Understanding.
          </>
        }
      />
    </Scenario>
  );
}

// ---------------------------------------------------------------------------
// CLOSER — Full Dashboard
// Browser-frame wrapper around a compressed dashboard overview. Members
// see at a glance: everything from morning brief to Aven chat to live
// trades sits in one place.
// ---------------------------------------------------------------------------

function Closer() {
  return (
    <Reveal>
      <div className="mt-24 sm:mt-32">
        <div className="relative">
          {/* Ambient emerald glow behind the browser frame. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-emerald/[0.04] blur-3xl"
          />

          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_30px_120px_-40px_rgba(16,185,129,0.25),0_8px_32px_-12px_rgba(0,0,0,0.6)]">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-surface-elevated/60 px-4 py-2.5">
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

            {/* Dashboard preview — compressed overview of the surfaces */}
            <div className="space-y-3 bg-background/60 p-4 sm:p-6">
              <MockTopRow />
              <MockAvenLiveBar compact />
              <div className="grid gap-3 lg:grid-cols-2">
                <MockBriefCard compact />
                <MockMarketPulse />
              </div>
              <MockTradesGridStrip />
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-base leading-relaxed text-muted-foreground sm:text-lg">
          Everything in one place. Built by traders, for traders.
        </p>
      </div>
    </Reveal>
  );
}

// ---------------------------------------------------------------------------
// MOCKS — static replicas. Tokens (border-border, bg-surface,
// text-emerald, etc.) match the live components so the showcase
// reads as a screenshot of the real thing.
// ---------------------------------------------------------------------------

function MockAvenAvatar({ size = 24 }: { size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-emerald/[0.18] ring-2 ring-emerald/40"
    >
      <span
        className="size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.65)]"
      />
    </span>
  );
}

function MockAvenLiveBar({ compact = false }: { compact?: boolean } = {}) {
  const py = compact ? "py-2" : "py-3";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-br from-surface via-surface to-emerald/[0.04] px-5 ${py} shadow-[0_0_60px_-20px_rgba(16,185,129,0.3)]`}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <div className="flex items-center gap-3">
          <MockAvenAvatar size={24} />
          <div className="leading-tight">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald/85">
              AI Mentor
            </p>
            <p className="text-[15px] font-semibold tracking-tight text-foreground">
              Aven
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex max-w-md items-center gap-2.5 truncate text-[13px]">
            <span
              aria-hidden
              className="inline-flex size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.65)]"
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald/75">
              Live
            </span>
            <span className="truncate italic text-emerald-300/80">
              &ldquo;Watching BTC 4H bull-cross&rdquo;
            </span>
          </div>
        </div>

        <span aria-hidden className="h-0 w-0" />
      </div>
    </div>
  );
}

function MockBriefCard({ compact = false }: { compact?: boolean } = {}) {
  return (
    <div
      className={`rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-amber-500/30 bg-amber-500/[0.08]">
          <span className="text-base" aria-hidden>
            🌅
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <h3 className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-200">
                BTC
              </span>
              <span>Morning Briefing</span>
            </h3>
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              created by Aven · 2h ago
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>18.05.2026</span>
            <span>
              Spot <span className="text-foreground">$76,812</span>
            </span>
          </div>

          {!compact && (
            <figure className="mt-4 rounded-xl border-l-2 border-emerald-500/40 bg-emerald-500/[0.04] px-4 py-3">
              <figcaption className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
                DAILY · Bias
              </figcaption>
              <blockquote className="mt-1 text-[15px] leading-relaxed text-foreground">
                bullish — structurally aligned with the higher timeframe.
              </blockquote>
            </figure>
          )}

          <div className={compact ? "mt-3" : "mt-5"}>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
              🎯 OVERALL PICTURE &amp; SETUP
            </p>
            {!compact && (
              <div className="mt-2 space-y-3">
                <div className="border-l-2 border-emerald-500/25 pl-3">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                    HIGHER TREND
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-foreground/90">
                    Bullish — Daily and 4H structurally aligned, higher
                    highs established.
                  </p>
                </div>
                <div className="border-l-2 border-emerald-500/25 pl-3">
                  <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                    STRONGEST SIGNAL
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-foreground/90">
                    Confluence of Daily 0.618 + EMA-50 + ascending TL at
                    $75,200.
                  </p>
                </div>
              </div>
            )}
          </div>

          {!compact && (
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-emerald/30 bg-emerald/[0.10] px-3 py-1.5 text-sm font-medium text-emerald">
              <span aria-hidden>📖</span>
              Read full brief
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MockChatBubbles({
  user,
  avenIntro,
  avenBody,
  score,
}: {
  user: string;
  avenIntro: string;
  avenBody: string;
  score?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Member bubble — right-aligned, emerald-tinted. */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald/[0.12] px-4 py-2.5 text-[15px] leading-relaxed text-foreground">
          <p>{user}</p>
        </div>
      </div>
      <div className="flex justify-end px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        you · 09:42
      </div>

      {/* Aven bubble — left-aligned, surface-elevated, with optional score pill. */}
      <div className="flex items-start gap-3">
        <MockAvenAvatar size={28} />
        <div className="max-w-[85%]">
          <div className="rounded-2xl rounded-tl-sm bg-surface-elevated px-4 py-3 text-[15px] leading-relaxed text-foreground">
            {score !== undefined && (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.08] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald">
                Setup score · {score}/10
              </span>
            )}
            <p className={score !== undefined ? "" : "mt-0"}>{avenIntro}</p>
            <p className="mt-2 text-foreground/90">{avenBody}</p>
          </div>
          <div className="mt-1 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Aven · 09:43
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline SVG mock chart — candle outline + a few horizontal Fibonacci
// lines + an ascending trendline. Stylised, not a real screenshot, but
// reads as "Aven sent an annotated chart" at a glance.
function MockChartImage() {
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

      {/* Fibonacci levels */}
      {[
        { y: 60, label: "0.786", color: "#fbbf24" },
        { y: 100, label: "0.618", color: "#34d399" },
        { y: 140, label: "0.500", color: "#94a3b8" },
        { y: 180, label: "0.382", color: "#94a3b8" },
        { y: 220, label: "0.236", color: "#94a3b8" },
      ].map((f) => (
        <g key={f.label}>
          <line
            x1="30"
            y1={f.y}
            x2="570"
            y2={f.y}
            stroke={f.color}
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity={f.color === "#94a3b8" ? 0.25 : 0.6}
          />
          <text
            x="572"
            y={f.y + 3}
            fontSize="9"
            fill={f.color}
            fontFamily="ui-monospace, monospace"
            opacity={f.color === "#94a3b8" ? 0.5 : 0.95}
          >
            {f.label}
          </text>
        </g>
      ))}

      {/* Ascending trendline */}
      <line
        x1="60"
        y1="240"
        x2="540"
        y2="110"
        stroke="#34d399"
        strokeWidth="1.4"
        opacity="0.75"
      />

      {/* Candle bodies — bullish + bearish mix climbing */}
      {[
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
      ].map((c) => {
        const top = Math.min(c.o, c.c);
        const bottom = Math.max(c.o, c.c);
        const color = c.bull ? "#34d399" : "#f87171";
        return (
          <g key={c.x}>
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
          </g>
        );
      })}

      {/* "Entry zone" annotation around the 0.618 level */}
      <rect
        x="380"
        y="85"
        width="160"
        height="32"
        fill="#34d399"
        opacity="0.08"
      />
      <text
        x="385"
        y="78"
        fontSize="9"
        fill="#34d399"
        fontFamily="ui-monospace, monospace"
      >
        ENTRY ZONE
      </text>
    </svg>
  );
}

function MockUnrealizedPnlCard({
  usd,
  pct,
  symbol,
  entry,
  sl,
  tp,
  negative = false,
}: {
  usd: string;
  pct: string;
  symbol: string;
  entry: string;
  sl: string;
  tp: string;
  negative?: boolean;
}) {
  const tone = negative ? "text-red-300" : "text-emerald";
  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Unrealized PnL
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <p className={`font-mono text-2xl font-semibold ${tone}`}>{usd}</p>
            <p className={`font-mono text-base font-semibold ${tone}`}>{pct}</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald" />1 open · {symbol}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-border/60 pt-3 font-mono text-[11px]">
        <span className="inline-flex items-baseline gap-1">
          <span className="text-muted-foreground">Entry</span>
          <span className="text-foreground">{entry}</span>
        </span>
        <span className="inline-flex items-baseline gap-1">
          <span className="text-muted-foreground">SL</span>
          <span className="text-foreground">{sl}</span>
          <span className="text-muted-foreground">
            (<span className="text-red-300">−400$</span>)
          </span>
        </span>
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        <span className="inline-flex items-baseline gap-1">
          <span className="text-muted-foreground">TP</span>
          <span className="text-foreground">{tp}</span>
          <span className="text-muted-foreground">
            (<span className="text-emerald">+350$</span>)
          </span>
        </span>
      </div>
    </div>
  );
}

function MockPaulsTrades() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
            Paul&apos;s Trades
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Following Paul
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald">
          Win-rate · 75%
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MockMiniStat label="Realized" value="+$8,420" tone="text-emerald" />
        <MockMiniStat label="Last 30d" value="+12.4%" tone="text-emerald" />
        <MockMiniStat label="Trades" value="84" />
      </div>

      <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        Last 5 trades
      </p>
      <ul className="mt-2 space-y-1.5">
        <MockTradeRow num="#84" sym="BTCUSDT" side="short" lev="20x" pct="+9.61%" pos />
        <MockTradeRow num="#83" sym="ETHUSDT" side="long" lev="10x" pct="+4.20%" pos />
        <MockTradeRow num="#82" sym="SOLUSDT" side="long" lev="5x" pct="−1.85%" pos={false} />
        <MockTradeRow num="#81" sym="BTCUSDT" side="long" lev="15x" pct="+11.30%" pos />
        <MockTradeRow num="#80" sym="ETHUSDT" side="short" lev="8x" pct="+3.05%" pos />
      </ul>
    </div>
  );
}

function MockMiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-base font-semibold ${
          tone ?? "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MockTradeRow({
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
    <li className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span className="font-mono text-[10px] text-muted-foreground">{num}</span>
      <span className="font-mono font-medium text-foreground">{sym}</span>
      <span
        className={`inline-flex rounded-md px-2 py-0.5 font-mono text-[10px] uppercase ${sideTone}`}
      >
        {side} · {lev}
      </span>
      <span className={`ml-auto font-mono text-sm font-semibold ${tone}`}>
        {pct}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Closer-only helper mocks — tiny strips of additional surfaces so the
// browser frame reads as a complete dashboard, not just the Brief +
// Aven slice.
// ---------------------------------------------------------------------------

function MockTopRow() {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <MockTopCard label="BTC.USDT.P" value="$76,812" sub="Live · Binance" />
      <MockTopCard
        label="Unrealized PnL"
        value="+$320"
        sub="+1.2%"
        valueTone="text-emerald"
        subTone="text-emerald"
      />
      <MockTopCard
        label="Realized PnL"
        value="+$8,420"
        sub="Win-Rate 75% · 84 closed"
        valueTone="text-emerald"
      />
    </div>
  );
}

function MockTopCard({
  label,
  value,
  sub,
  valueTone,
  subTone,
}: {
  label: string;
  value: string;
  sub: string;
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

function MockMarketPulse() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
        Market pulse
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        {[
          { l: "Trend (Daily)", v: "Bullish", t: "text-emerald" },
          { l: "Volatility", v: "Normal" },
          { l: "Volume", v: "Above avg", t: "text-emerald" },
          { l: "Sentiment", v: "Risk-on", t: "text-emerald" },
          { l: "Funding rate", v: "+0.012%" },
          { l: "OI delta", v: "+2.4%", t: "text-emerald" },
        ].map((m) => (
          <div
            key={m.l}
            className="rounded-md border border-border bg-background px-2.5 py-1.5"
          >
            <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {m.l}
            </p>
            <p className={`font-mono text-sm font-medium ${m.t ?? "text-foreground"}`}>
              {m.v}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockTradesGridStrip() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
          Your trades
        </p>
        <p className="mt-1 text-sm text-muted-foreground">1 open · 8 closed</p>
        <ul className="mt-3 space-y-1.5">
          <MockTradeRow num="#9" sym="BTCUSDT" side="long" lev="5x" pct="+3.34%" pos />
          <MockTradeRow num="#8" sym="ETHUSDT" side="short" lev="10x" pct="−1.10%" pos={false} />
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald/85">
          Paul&apos;s trades
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Win-rate 75% · 84 closed
        </p>
        <ul className="mt-3 space-y-1.5">
          <MockTradeRow num="#84" sym="BTCUSDT" side="short" lev="20x" pct="+9.61%" pos />
          <MockTradeRow num="#83" sym="ETHUSDT" side="long" lev="10x" pct="+4.20%" pos />
        </ul>
      </div>
    </div>
  );
}
