"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconMinus,
  IconAlertCircle,
  IconClockHour4,
  IconRefresh,
} from "@tabler/icons-react";
import { MetricTooltip } from "@/components/MetricTooltip";
import {
  buildMetricsView,
  METRIC_META,
  type MetricKey,
  type MetricsView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import type { MetricCard, Trend } from "@/lib/mock-dashboard";

const POLL_INTERVAL_MS = 60_000;
const STALE_THRESHOLD_MS = 2 * 60_000;
const STALE_TICK_MS = 15_000;

const TREND_TONE: Record<Trend, string> = {
  bullish: "text-emerald",
  bearish: "text-red-300",
  neutral: "text-muted-foreground",
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "bullish")
    return <IconArrowUpRight size={14} stroke={2} aria-hidden />;
  if (trend === "bearish")
    return <IconArrowDownRight size={14} stroke={2} aria-hidden />;
  return <IconMinus size={14} stroke={2} aria-hidden />;
}

function timeAgoFromMs(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60_000)}m ago`;
}

function isMetricKey(s: string): s is MetricKey {
  return s === "btc" || s === "fng" || s === "oi" || s === "funding" || s === "lsr";
}

interface Props {
  initial: MetricsView | null;
}

export function TopStripMetrics({ initial }: Props) {
  const [view, setView] = useState<MetricsView | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);
  const [refreshing, setRefreshing] = useState(false);
  // Used to force re-render so the stale flag updates over time without
  // mutating view (which would create a fresh fetchedAt every tick).
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
      setView(buildMetricsView(raw, Date.now()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Initial fetch if no SSR seed
  useEffect(() => {
    if (initial) return;
    void fetchOnce();
  }, [initial, fetchOnce]);

  // Polling — every 60s
  useEffect(() => {
    const id = setInterval(() => void fetchOnce(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchOnce]);

  // Stale-tick — re-evaluate the stale badge every 15s without re-fetching
  useEffect(() => {
    const id = setInterval(() => setStaleTick((n) => n + 1), STALE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) return <SkeletonStrip />;

  const ageMs = view ? Date.now() - view.fetchedAt : Infinity;
  const isStale = ageMs > STALE_THRESHOLD_MS;
  const cards = view?.cards ?? [];

  return (
    <section aria-label="Market metrics" className="space-y-3">
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

      {isStale && !error && (
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
          <IconClockHour4 size={12} stroke={1.75} aria-hidden />
          Stale data · last refresh {timeAgoFromMs(ageMs)}
        </div>
      )}

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <ul
          role="list"
          className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5"
        >
          {cards.map((card) => (
            <MetricCardItem key={card.key} card={card} stale={isStale} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function MetricCardItem({
  card,
  stale,
}: {
  card: MetricCard;
  stale: boolean;
}) {
  const meta = isMetricKey(card.key) ? METRIC_META[card.key] : null;

  return (
    <li
      className={[
        "min-w-[150px] rounded-xl border border-border bg-surface p-4 transition-opacity",
        stale ? "opacity-70" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {card.label}
          </p>
          {meta && (
            <MetricTooltip label={meta.fullLabel} explanation={meta.explanation} />
          )}
        </div>
        {card.delta && (
          <span
            className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${TREND_TONE[card.trend]}`}
          >
            <TrendIcon trend={card.trend} />
            {card.delta}
          </span>
        )}
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-foreground">
        {card.value}
      </p>
      {card.caption && (
        <p
          className={`mt-1 text-[11px] ${
            card.delta ? "text-muted-foreground" : TREND_TONE[card.trend]
          }`}
        >
          {card.caption}
        </p>
      )}
    </li>
  );
}

function SkeletonStrip() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading metrics"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
    >
      <ul
        role="list"
        className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <li
            key={i}
            className="min-w-[150px] rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="h-3 w-16 animate-pulse rounded bg-surface-elevated" />
              <span className="h-3 w-10 animate-pulse rounded bg-surface-elevated" />
            </div>
            <span className="mt-3 block h-5 w-24 animate-pulse rounded bg-surface-elevated" />
            <span className="mt-2 block h-3 w-20 animate-pulse rounded bg-surface-elevated" />
          </li>
        ))}
      </ul>
    </div>
  );
}
