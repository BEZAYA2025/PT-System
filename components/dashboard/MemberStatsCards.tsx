"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildTradesView,
  type TradesStats,
  type YourTradesMeta,
} from "@/lib/trades";
import {
  buildBtcPriceView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { usePolling } from "@/lib/use-polling";

const POLL_INTERVAL_MS = 5_000;

function fmtCompactPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(2)}`;
}

function fmtBigUsd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n === 0) return "$0";
  const sign = n > 0 ? "+" : "−";
  const abs = Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return `${sign}$${abs}`;
}

function toneFor(n: number | null): string {
  if (n === null || n === 0) return "text-foreground";
  return n > 0 ? "text-emerald" : "text-red-300";
}

function fmtSignedPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
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
 *
 * Round-14d: card maintains its own state on top of the SSR props and
 * polls /snapshot + /my-trades every 5s (Page Visibility pause). The
 * Unrealized PnL value updates in near-real-time without a router refresh.
 */
export function MemberStatsCards({
  btcPrice: initialBtcPrice,
  stats: initialStats,
  meta: initialMeta,
}: Props) {
  const [btcPrice, setBtcPrice] = useState<number | null>(initialBtcPrice);
  const [stats, setStats] = useState<TradesStats>(initialStats);
  const [meta, setMeta] = useState<YourTradesMeta | undefined>(initialMeta);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [snapRes, myRes] = await Promise.all([
        fetch("/api/proxy/snapshot", { cache: "no-store" }),
        fetch("/api/proxy/cockpit/my-trades", { cache: "no-store" }),
      ]);
      if (snapRes.ok) {
        const raw = (await snapRes.json()) as RawSnapshotMetrics;
        setBtcPrice(buildBtcPriceView(raw, Date.now()).price);
      }
      if (myRes.ok) {
        const myRaw = await myRes.json().catch(() => null);
        // buildTradesView wants both my + paul; we only need the `your`
        // half so pass null for paul (it doesn't affect your.stats).
        const view = buildTradesView(myRaw, null, Date.now());
        setStats(view.your.stats);
        if (view.yourMeta) setMeta(view.yourMeta);
      }
    } catch {
      // Silent — top-card values just don't refresh until next tick.
    } finally {
      inFlight.current = false;
    }
  }, []);

  usePolling({ fn: refresh, intervalMs: POLL_INTERVAL_MS });

  const connected = meta?.hasExchange ?? false;
  const unrealized = stats.unrealizedPnlSum;
  const unrealizedPct = stats.unrealizedPnlPct;
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
            <SubLine muted>
              {unrealizedPct !== null ? (
                <span className={toneFor(unrealizedPct)}>
                  {fmtSignedPct(unrealizedPct)}
                </span>
              ) : null}
              {unrealizedPct !== null && <span aria-hidden>·</span>}
              <span>across open positions</span>
            </SubLine>
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
