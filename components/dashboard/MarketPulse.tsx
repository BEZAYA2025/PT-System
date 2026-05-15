"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconArrowDownRight,
  IconArrowUpRight,
  IconClockHour4,
  IconRefresh,
} from "@tabler/icons-react";
import { MetricTooltip } from "@/components/MetricTooltip";
import {
  buildMarketPulseView,
  PULSE_TOOLTIPS,
  type MarketPulseView,
  type RawSnapshotMetrics,
  type Trend,
} from "@/lib/metrics";

const POLL_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 2 * 60_000;
const STALE_TICK_MS = 15_000;

const TREND_TONE: Record<Trend, string> = {
  bullish: "text-emerald",
  bearish: "text-red-300",
  neutral: "text-muted-foreground",
};

// Per-accent border + faint background tints. Values stay readable on
// the dark surface without overwhelming the grid layout.
type Accent =
  | "neutral"
  | "fear"
  | "anxious"
  | "greedy"
  | "extreme-greed"
  | "bull"
  | "bear"
  | "cyan";

const ACCENT_CARD: Record<Accent, string> = {
  neutral: "border-border bg-surface",
  fear: "border-red-500/35 bg-gradient-to-br from-surface to-red-500/[0.06]",
  anxious:
    "border-orange-500/35 bg-gradient-to-br from-surface to-orange-500/[0.06]",
  greedy:
    "border-emerald/35 bg-gradient-to-br from-surface to-emerald/[0.06]",
  "extreme-greed":
    "border-lime-400/40 bg-gradient-to-br from-surface to-lime-400/[0.07]",
  bull: "border-emerald/35 bg-gradient-to-br from-surface to-emerald/[0.05]",
  bear: "border-red-500/35 bg-gradient-to-br from-surface to-red-500/[0.05]",
  cyan: "border-cyan-400/35 bg-gradient-to-br from-surface to-cyan-400/[0.05]",
};

const ACCENT_VALUE: Record<Accent, string> = {
  neutral: "text-foreground",
  fear: "text-red-300",
  anxious: "text-orange-300",
  greedy: "text-emerald",
  "extreme-greed": "text-lime-300",
  bull: "text-emerald",
  bear: "text-red-300",
  cyan: "text-cyan-300",
};

function fearGreedAccent(value: number | null): Accent {
  if (value === null) return "neutral";
  if (value <= 25) return "fear";
  if (value <= 45) return "anxious";
  if (value <= 55) return "neutral";
  if (value <= 75) return "greedy";
  return "extreme-greed";
}

interface Props {
  initial: MarketPulseView | null;
}

export function MarketPulse({ initial }: Props) {
  const [view, setView] = useState<MarketPulseView | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setStaleTick] = useState(0);
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await fetch("/api/proxy/snapshot", { cache: "no-store" });
      if (!res.ok) {
        setError(`Snapshot ${res.status}`);
        return;
      }
      const raw = (await res.json()) as RawSnapshotMetrics;
      setView(buildMarketPulseView(raw, Date.now()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) return;
    void fetchOnce();
  }, [initial, fetchOnce]);

  useEffect(() => {
    const id = setInterval(() => void fetchOnce(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOnce]);

  useEffect(() => {
    const id = setInterval(() => setStaleTick((n) => n + 1), STALE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) return <SkeletonPulse />;

  const ageMs = view ? Date.now() - view.fetchedAt : Infinity;
  const isStale = ageMs > STALE_THRESHOLD_MS;

  return (
    <section aria-label="Market pulse" className="space-y-3">
      <header className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Market Pulse
        </p>
        {isStale && !error && (
          <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <IconClockHour4 size={11} stroke={1.75} aria-hidden />
            stale · {Math.floor(ageMs / 60_000)}m
          </p>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5 text-sm"
        >
          <p className="flex items-center gap-2 text-amber-200">
            <IconAlertCircle size={16} stroke={1.75} aria-hidden />
            Daten kurz nicht erreichbar
          </p>
          <button
            type="button"
            onClick={() => void fetchOnce()}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 disabled:opacity-60"
          >
            <IconRefresh
              size={12}
              stroke={2}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <ul
          role="list"
          className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5"
        >
          <FearGreedCard data={view?.fearGreed ?? null} stale={isStale} />
          <FundingCard data={view?.funding ?? null} stale={isStale} />
          <OpenInterestCard data={view?.openInterest ?? null} stale={isStale} />
          <LsRatioCard data={view?.lsRatio ?? null} stale={isStale} />
          <BtcDominanceCard data={view?.btcDominance ?? null} stale={isStale} />
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared shell
// ---------------------------------------------------------------------------

function CardShell({
  label,
  tooltip,
  stale,
  delta,
  accent = "neutral",
  children,
}: {
  label: string;
  tooltip: { title: string; body: string };
  stale: boolean;
  delta?: { value: string; trend: Trend } | null;
  accent?: Accent;
  children: React.ReactNode;
}) {
  return (
    <li
      className={[
        "min-w-[155px] rounded-xl border p-4 transition-opacity",
        ACCENT_CARD[accent],
        stale ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <MetricTooltip label={tooltip.title} explanation={tooltip.body} />
        </div>
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${TREND_TONE[delta.trend]}`}
          >
            {delta.trend === "bullish" ? (
              <IconArrowUpRight size={11} stroke={2} aria-hidden />
            ) : delta.trend === "bearish" ? (
              <IconArrowDownRight size={11} stroke={2} aria-hidden />
            ) : null}
            {delta.value}
          </span>
        )}
      </div>
      <div className="mt-2">{children}</div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Individual cards
// ---------------------------------------------------------------------------

function FearGreedCard({
  data,
  stale,
}: {
  data: MarketPulseView["fearGreed"] | null;
  stale: boolean;
}) {
  const value = data?.value ?? null;
  const accent = fearGreedAccent(value);
  return (
    <CardShell
      label="Fear & Greed"
      tooltip={{ title: "Crypto Fear & Greed Index", body: PULSE_TOOLTIPS.fearGreed }}
      stale={stale}
      accent={accent}
    >
      <p className="flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-semibold ${ACCENT_VALUE[accent]}`}>
          {value !== null ? value : "—"}
        </span>
        <span className="font-mono text-xs text-muted-foreground">/ 100</span>
      </p>
      <p className={`mt-1 text-[11px] ${ACCENT_VALUE[accent]}`}>
        {data?.label ?? "—"}
      </p>
    </CardShell>
  );
}

function FundingCard({
  data,
  stale,
}: {
  data: MarketPulseView["funding"] | null;
  stale: boolean;
}) {
  const rate = data?.rate ?? null;
  const pct = rate !== null && Math.abs(rate) < 0.01 ? rate * 100 : rate;
  const accent: Accent =
    rate === null ? "neutral" : rate > 0 ? "bull" : rate < 0 ? "bear" : "neutral";
  return (
    <CardShell
      label="BTC Funding"
      tooltip={{ title: "Perpetual funding rate", body: PULSE_TOOLTIPS.funding }}
      stale={stale}
      accent={accent}
    >
      <p className={`font-mono text-lg font-semibold ${ACCENT_VALUE[accent]}`}>
        {pct !== null
          ? `${pct > 0 ? "+" : ""}${pct.toFixed(4)}%`
          : "—"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        8h{data?.source ? ` · ${data.source}` : ""}
      </p>
    </CardShell>
  );
}

function fmtCompactUsd(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtCompactBtc(n: number | null): string | null {
  if (n === null) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M BTC`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k BTC`;
  return `${n.toFixed(2)} BTC`;
}

function OpenInterestCard({
  data,
  stale,
}: {
  data: MarketPulseView["openInterest"] | null;
  stale: boolean;
}) {
  const usd = data?.usd ?? null;
  const btc = data?.btc ?? null;
  const delta = data?.deltaPct ?? null;
  // OI itself stays neutral chrome — the delta arrow carries the
  // bull/bear signal (large OI rise on rally = leveraged push, on
  // dump = capitulation; tone shouldn't double-encode).
  return (
    <CardShell
      label="Open Interest"
      tooltip={{
        title: "Aggregated Open Interest",
        body: PULSE_TOOLTIPS.openInterest,
      }}
      stale={stale}
      delta={
        delta !== null
          ? {
              value: `${delta > 0 ? "+" : ""}${delta.toFixed(2)}%`,
              trend: data?.trend ?? "neutral",
            }
          : null
      }
    >
      <p className="font-mono text-lg font-semibold text-foreground">
        {fmtCompactUsd(usd)}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {btc !== null ? fmtCompactBtc(btc) : "—"}
      </p>
    </CardShell>
  );
}

function LsRatioCard({
  data,
  stale,
}: {
  data: MarketPulseView["lsRatio"] | null;
  stale: boolean;
}) {
  const value = data?.value ?? null;
  const longP = data?.longPct ?? null;
  const shortP = data?.shortPct ?? null;
  const accent: Accent =
    value === null ? "neutral" : value > 1 ? "bull" : value < 1 ? "bear" : "neutral";
  return (
    <CardShell
      label="L/S Ratio"
      tooltip={{ title: "Long / Short ratio", body: PULSE_TOOLTIPS.lsRatio }}
      stale={stale}
      accent={accent}
    >
      <p className={`font-mono text-lg font-semibold ${ACCENT_VALUE[accent]}`}>
        {value !== null ? value.toFixed(2) : "—"}
      </p>
      <p className="mt-1 text-[11px]">
        {longP !== null && shortP !== null ? (
          <span>
            <span className="text-emerald">{longP.toFixed(0)}% L</span>
            <span className="text-muted-foreground"> · </span>
            <span className="text-red-300">{shortP.toFixed(0)}% S</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Share split unavailable</span>
        )}
      </p>
    </CardShell>
  );
}

function BtcDominanceCard({
  data,
  stale,
}: {
  data: MarketPulseView["btcDominance"] | null;
  stale: boolean;
}) {
  const dom = data?.pct ?? null;
  const cap = data?.marketCapUsd ?? null;
  // BTC.D rising = capital rotating into BTC (cyan growth);
  // falling = alt-season tilt (rose). When trend is neutral, leave neutral.
  const accent: Accent =
    data?.trend === "bullish"
      ? "cyan"
      : data?.trend === "bearish"
        ? "bear"
        : "neutral";
  return (
    <CardShell
      label="BTC Dominance"
      tooltip={{ title: "Bitcoin market-cap dominance", body: PULSE_TOOLTIPS.btcDominance }}
      stale={stale}
      accent={accent}
    >
      <p className={`font-mono text-lg font-semibold ${ACCENT_VALUE[accent]}`}>
        {dom !== null ? `${dom.toFixed(2)}%` : "—"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {cap !== null ? `Cap ${fmtCompactUsd(cap)}` : "Market cap unavailable"}
      </p>
    </CardShell>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SkeletonPulse() {
  return (
    <div className="space-y-3" aria-busy="true">
      <span className="block h-3 w-24 animate-pulse rounded bg-surface-elevated" />
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <ul
          role="list"
          className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="min-w-[155px] rounded-xl border border-border bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="h-3 w-16 animate-pulse rounded bg-surface-elevated" />
                <span className="h-3 w-10 animate-pulse rounded bg-surface-elevated" />
              </div>
              <span className="mt-3 block h-6 w-24 animate-pulse rounded bg-surface-elevated" />
              <span className="mt-2 block h-3 w-20 animate-pulse rounded bg-surface-elevated" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
