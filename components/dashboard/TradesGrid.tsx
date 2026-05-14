"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconUserCheck,
  IconAlertCircle,
  IconClockHour4,
  IconRefresh,
} from "@tabler/icons-react";
import { TradeDetailModal } from "./TradeDetailModal";
import { shapeTrades, type AnyTrade, type TradesView } from "@/lib/trades";

const POLL_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 2 * 60_000;
const STALE_TICK_MS = 15_000;
const FRESH_INDICATOR_MS = 30_000;

function fmtPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtSignedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${sign}$${abs}`;
}

function fmtSignedPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function fmtSignedR(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}R`;
}

interface Props {
  initial: TradesView | null;
}

export function TradesGrid({ initial }: Props) {
  const [view, setView] = useState<TradesView | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const [detail, setDetail] = useState<AnyTrade | null>(null);
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
      const raw = await res.json();
      setView(shapeTrades(raw, Date.now()));
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
    const id = setInterval(() => setTick((n) => n + 1), STALE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) return <SkeletonTrades />;

  const ageMs = view ? Date.now() - view.fetchedAt : Infinity;
  const isStale = ageMs > STALE_THRESHOLD_MS;
  const isFresh = ageMs < FRESH_INDICATOR_MS;

  return (
    <>
      <div className="space-y-3">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5 text-sm"
          >
            <p className="flex items-center gap-2 text-amber-200">
              <IconAlertCircle size={16} stroke={1.75} aria-hidden />
              Trades momentarily unreachable
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
            Stale data · last refresh {Math.floor(ageMs / 60_000)}m ago
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <YourTradesSection
            active={view?.your.active ?? []}
            recent={view?.your.recent ?? []}
            onSelect={setDetail}
            isFresh={isFresh}
          />
          <PaulsTradesSection
            active={view?.pauls.active ?? []}
            recent={view?.pauls.recent ?? []}
            onSelect={setDetail}
            isFresh={isFresh}
          />
        </div>
      </div>

      <TradeDetailModal trade={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function LiveDot() {
  return (
    <span
      aria-label="Live data"
      title="Live"
      className="relative inline-flex size-2"
    >
      <span
        className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
        style={{ animationDuration: "1.8s" }}
      />
      <span className="relative inline-flex size-2 rounded-full bg-emerald" />
    </span>
  );
}

function YourTradesSection({
  active,
  recent,
  onSelect,
  isFresh,
}: {
  active: import("@/lib/trades").YourTrade[];
  recent: import("@/lib/trades").YourTrade[];
  onSelect: (t: AnyTrade) => void;
  isFresh: boolean;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Your trades
        </h2>
      </div>

      <ActiveBlock title="Active" isFresh={isFresh && active.length > 0}>
        {active.length === 0 ? (
          <EmptyRow message="No open positions" />
        ) : (
          active.map((t) => (
            <YourTradeRow key={t.id} trade={t} onClick={() => onSelect(t)} />
          ))
        )}
      </ActiveBlock>

      <RecentBlock title="Recent — last 5 closed">
        {recent.length === 0 ? (
          <EmptyRow message="No trades yet — your positions will appear here." />
        ) : (
          recent.map((t) => (
            <YourTradeRow key={t.id} trade={t} onClick={() => onSelect(t)} />
          ))
        )}
      </RecentBlock>
    </section>
  );
}

function PaulsTradesSection({
  active,
  recent,
  onSelect,
  isFresh,
}: {
  active: import("@/lib/trades").PaulsTrade[];
  recent: import("@/lib/trades").PaulsTrade[];
  onSelect: (t: AnyTrade) => void;
  isFresh: boolean;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Paul&apos;s trades
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
          <IconUserCheck size={12} stroke={2} />
          Following Paul
        </span>
      </div>

      <ActiveBlock title="Active" isFresh={isFresh && active.length > 0}>
        {active.length === 0 ? (
          <EmptyRow message="No active positions from Paul right now." />
        ) : (
          active.map((t) => (
            <PaulsTradeRow key={t.id} trade={t} onClick={() => onSelect(t)} />
          ))
        )}
      </ActiveBlock>

      <RecentBlock title="Recent — last 5 closed">
        {recent.length === 0 ? (
          <EmptyRow message="No recent closed trades from Paul." />
        ) : (
          recent.map((t) => (
            <PaulsTradeRow key={t.id} trade={t} onClick={() => onSelect(t)} />
          ))
        )}
      </RecentBlock>
    </section>
  );
}

function ActiveBlock({
  title,
  isFresh,
  children,
}: {
  title: string;
  isFresh: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
        {isFresh && <LiveDot />}
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function RecentBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

function SideBadge({ side }: { side: "long" | "short" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase",
        side === "long"
          ? "bg-emerald/[0.1] text-emerald"
          : "bg-red-500/[0.1] text-red-300",
      ].join(" ")}
    >
      {side}
    </span>
  );
}

function PnlIcon({ positive }: { positive: boolean }) {
  return positive ? (
    <IconArrowUpRight size={14} stroke={2} aria-hidden />
  ) : (
    <IconArrowDownRight size={14} stroke={2} aria-hidden />
  );
}

function YourTradeRow({
  trade,
  onClick,
}: {
  trade: import("@/lib/trades").YourTrade;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-foreground/20 sm:grid-cols-[1.4fr_auto_auto]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm font-semibold text-foreground">
            {trade.symbol}
          </p>
          <SideBadge side={trade.side} />
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {trade.status === "open"
            ? `${fmtPrice(trade.entry)} → ${fmtPrice(trade.mark)} · ${trade.durationLabel}`
            : `${fmtPrice(trade.entry)} → ${fmtPrice(trade.exit)} · ${trade.durationLabel}`}
        </p>
        {trade.status === "open" && (
          <p className="mt-0.5 font-mono text-[11px]">
            {trade.slDistancePct !== null && (
              <span className="text-red-300/80">
                SL {trade.slDistancePct.toFixed(1)}%
              </span>
            )}
            {trade.slDistancePct !== null && trade.tpDistancePct !== null && (
              <span className="text-muted-foreground"> · </span>
            )}
            {trade.tpDistancePct !== null && (
              <span className="text-emerald/80">
                TP {trade.tpDistancePct.toFixed(1)}%
              </span>
            )}
          </p>
        )}
      </div>

      <div className={`text-right font-mono text-sm font-semibold ${tone}`}>
        <div className="flex items-center justify-end gap-1">
          <PnlIcon positive={positive} />
          {fmtSignedPct(trade.pnlPct)}
        </div>
      </div>
      <div className={`hidden text-right font-mono text-sm ${tone} sm:block`}>
        {fmtSignedUsd(trade.pnlUsd)}
      </div>
    </button>
  );
}

function PaulsTradeRow({
  trade,
  onClick,
}: {
  trade: import("@/lib/trades").PaulsTrade;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-foreground/20 sm:grid-cols-[1.4fr_auto_auto]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm font-semibold text-foreground">
            {trade.symbol}
          </p>
          <SideBadge side={trade.side} />
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {trade.status === "open"
            ? `${fmtPrice(trade.entry)} → ${fmtPrice(trade.mark)} · ${trade.durationLabel}`
            : `${fmtPrice(trade.entry)} → ${fmtPrice(trade.exit)} · ${trade.durationLabel}`}
        </p>
        {trade.status === "open" && (
          <p className="mt-0.5 font-mono text-[11px]">
            {trade.slDistancePct !== null && (
              <span className="text-red-300/80">
                SL {trade.slDistancePct.toFixed(1)}%
              </span>
            )}
            {trade.slDistancePct !== null && trade.tpDistancePct !== null && (
              <span className="text-muted-foreground"> · </span>
            )}
            {trade.tpDistancePct !== null && (
              <span className="text-emerald/80">
                TP {trade.tpDistancePct.toFixed(1)}%
              </span>
            )}
          </p>
        )}
      </div>

      <div className={`text-right font-mono text-sm font-semibold ${tone}`}>
        <div className="flex items-center justify-end gap-1">
          <PnlIcon positive={positive} />
          {fmtSignedPct(trade.pnlPct)}
        </div>
      </div>
      <div className={`hidden text-right font-mono text-sm ${tone} sm:block`}>
        {fmtSignedR(trade.pnlR)}
      </div>
    </button>
  );
}

function SkeletonTrades() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      {[0, 1].map((col) => (
        <section
          key={col}
          className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <span className="block h-4 w-24 animate-pulse rounded bg-surface-elevated" />
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-4 w-20 animate-pulse rounded bg-surface" />
                  <span className="h-4 w-10 animate-pulse rounded bg-surface" />
                </div>
                <span className="mt-2 block h-3 w-3/4 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
