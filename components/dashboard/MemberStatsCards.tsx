"use client";

import type { TradesStats, YourTradesMeta } from "@/lib/trades";

function fmtCompactPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(2)}`;
}

function fmtBigUsd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  const sign = n > 0 ? "+" : "−";
  const abs = Math.abs(n).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  return `${sign}$${abs}`;
}

function toneFor(n: number | null): string {
  if (n === null || n === 0) return "text-foreground";
  return n > 0 ? "text-emerald" : "text-red-300";
}

interface Props {
  btcPrice: number | null;
  stats: TradesStats;
  meta?: YourTradesMeta;
}

/**
 * Top-level dashboard stats — extracted from the trades sections so member
 * KPIs are visible above the fold. Cards 2+3 fall back to a friendly
 * "connect exchange" hint when no exchange is linked.
 */
export function MemberStatsCards({ btcPrice, stats, meta }: Props) {
  const connected = meta?.hasExchange ?? false;
  const unrealized = stats.unrealizedPnlSum;
  const realized = stats.realizedPnlSum;
  const winRate = stats.winRatePct;
  const closed = stats.closedCount;

  return (
    <section
      aria-label="Member stats"
      className="grid gap-3 sm:grid-cols-3"
    >
      {/* Card 1 — BTC live price */}
      <Card>
        <Caption>BTC.USDT.P</Caption>
        <BigValue>{fmtCompactPrice(btcPrice)}</BigValue>
        <SubLine>
          <LiveDot />
          Live · Binance Perpetual
        </SubLine>
      </Card>

      {/* Card 2 — Unrealized PnL */}
      <Card>
        <Caption>Unrealized PnL</Caption>
        {connected ? (
          <>
            <BigValue tone={toneFor(unrealized)}>
              {fmtBigUsd(unrealized)}
            </BigValue>
            <SubLine muted>across open positions</SubLine>
          </>
        ) : (
          <>
            <BigValue muted>—</BigValue>
            <SubLine muted>Connect exchange in Settings</SubLine>
          </>
        )}
      </Card>

      {/* Card 3 — Realized PnL */}
      <Card>
        <Caption>Realized PnL</Caption>
        {connected ? (
          <>
            <BigValue tone={toneFor(realized)}>
              {fmtBigUsd(realized)}
            </BigValue>
            <SubLine muted>
              {winRate !== null && closed !== null
                ? `Win-Rate ${winRate.toFixed(0)}% · ${closed} closed`
                : closed !== null
                  ? `${closed} closed`
                  : "—"}
            </SubLine>
          </>
        ) : (
          <>
            <BigValue muted>—</BigValue>
            <SubLine muted>Stats unlock once you trade</SubLine>
          </>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Tiny shell parts kept inline for visual consistency
// ---------------------------------------------------------------------------

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3 sm:px-5 sm:py-4">
      {children}
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
      {children}
    </p>
  );
}

function BigValue({
  children,
  tone,
  muted = false,
}: {
  children: React.ReactNode;
  tone?: string;
  muted?: boolean;
}) {
  const cls = muted ? "text-muted-foreground" : (tone ?? "text-foreground");
  return (
    <p className={`mt-1 font-mono text-2xl font-semibold ${cls}`}>{children}</p>
  );
}

function SubLine({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  const cls = muted ? "text-muted-foreground" : "text-foreground";
  return (
    <p className={`mt-1 flex items-center gap-1.5 text-[11px] ${cls}`}>
      {children}
    </p>
  );
}

function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-1.5">
      <span
        className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
        style={{ animationDuration: "2s" }}
      />
      <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
    </span>
  );
}
