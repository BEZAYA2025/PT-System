"use client";

import { useCallback, useRef, useState } from "react";
import {
  aggregateExposure,
  buildTradesView,
  pnlAtPrice,
  type TradesStats,
  type YourTrade,
  type YourTradesMeta,
} from "@/lib/trades";
import {
  buildBtcPriceView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import type { CredentialStatus } from "@/lib/dal";
import { usePolling } from "@/lib/use-polling";

const POLL_INTERVAL_MS = 5_000;

/**
 * Source-of-truth resolution for "is this member connected to an
 * exchange right now?". Mirrors ExchangeSettingsCard's resolveStatus —
 * if `/api/auth/me`'s credential_status is `ok` or `founder_env` the
 * member counts as connected, regardless of whether `/api/cockpit/my-
 * trades` reported `has_exchange: false`.
 *
 * Round-14b production bug: my-trades returned `has_exchange: false`
 * during a brief sync gap right after Paul connected Bitunix, and the
 * card flipped to the "Connect exchange in Settings" empty-state even
 * though credential_status was `ok` and an open position existed.
 */
function isConnected(
  credentialStatus: CredentialStatus | undefined,
  hasExchangeFromMyTrades: boolean,
): boolean {
  if (credentialStatus === "ok" || credentialStatus === "founder_env") {
    return true;
  }
  if (credentialStatus === "missing" || credentialStatus === "invalid_please_relink") {
    return false;
  }
  // credentialStatus undefined → older backend deploy, trust the
  // my-trades flag as the legacy fallback.
  return hasExchangeFromMyTrades;
}

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
  /** From `/api/auth/me` — preferred over `meta.hasExchange` because
   *  the my-trades endpoint can briefly lag right after a fresh
   *  connection. Round-14b context: production hit a 5s window where
   *  this matter and the card flashed the empty state. */
  credentialStatus?: CredentialStatus;
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
  credentialStatus: ssrCredentialStatus,
}: Props) {
  const [btcPrice, setBtcPrice] = useState<number | null>(initialBtcPrice);
  const [stats, setStats] = useState<TradesStats>(initialStats);
  const [meta, setMeta] = useState<YourTradesMeta | undefined>(initialMeta);
  const [openTrades, setOpenTrades] = useState<YourTrade[]>([]);
  const inFlight = useRef(false);

  // Round-14c (verified): VPS now mirrors `credential_status` on
  // `/api/cockpit/my-trades` too. The 5s polling refresh below picks
  // that up via meta.credentialStatus, which means we react to a
  // freshly-connected (or revoked) key within one tick — without
  // waiting for a full router.refresh + /api/auth/me round-trip.
  // SSR prop stays as the cold-start value before the first poll.
  const credentialStatus = meta?.credentialStatus ?? ssrCredentialStatus;

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
        setOpenTrades(view.your.active);
        if (view.yourMeta) setMeta(view.yourMeta);
      }
    } catch {
      // Silent — top-card values just don't refresh until next tick.
    } finally {
      inFlight.current = false;
    }
  }, []);

  usePolling({ fn: refresh, intervalMs: POLL_INTERVAL_MS });

  const connected = isConnected(credentialStatus, meta?.hasExchange ?? false);
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

      {/* Card 2 — Unrealized PnL
       *
       * Round-14c: explicit 4-state machine per Paul's spec. The
       * previous boolean `connected ? activeState : emptyState`
       * collapsed two real states ("missing" and "invalid_please_
       * relink") into one CTA, and crashed against the production
       * desync case where credential_status said "ok" but my-trades
       * lagged so `connected` flipped false → false-negative empty
       * state on top of a real open position.
       *
       *   credential_status "missing"               → Connect CTA
       *   credential_status "invalid_please_relink" → Re-link CTA
       *   connected + open.length === 0             → Stats unlock copy
       *   connected + open.length > 0               → live PnL + %
       */}
      <Card>
        <Caption>Unrealized PnL</Caption>
        <UnrealizedPnlBody
          credentialStatus={credentialStatus}
          connected={connected}
          openTrades={openTrades}
          unrealized={unrealized}
          unrealizedPct={unrealizedPct}
        />
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

// ---------------------------------------------------------------------------
// Unrealized-PnL body — 4-state render per Paul's spec.
// ---------------------------------------------------------------------------

function UnrealizedPnlBody({
  credentialStatus,
  connected,
  openTrades,
  unrealized,
  unrealizedPct,
}: {
  credentialStatus: CredentialStatus | undefined;
  connected: boolean;
  openTrades: YourTrade[];
  unrealized: number | null;
  unrealizedPct: number | null;
}) {
  if (credentialStatus === "missing") {
    return (
      <>
        <BigValue muted>—</BigValue>
        <SubLine muted>Connect exchange in Settings</SubLine>
      </>
    );
  }
  if (credentialStatus === "invalid_please_relink") {
    return (
      <>
        <BigValue muted>—</BigValue>
        <SubLine muted>
          <span className="text-amber-300">Re-link your exchange</span>
        </SubLine>
      </>
    );
  }
  // credential_status "ok" / "founder_env" / undefined → use the
  // `connected` resolver. If we're still not connected here it means
  // the legacy fallback (my-trades has_exchange) also said false, so
  // surface the same Connect CTA.
  if (!connected) {
    return (
      <>
        <BigValue muted>—</BigValue>
        <SubLine muted>Connect exchange in Settings</SubLine>
      </>
    );
  }
  const openCount = openTrades.length;
  if (openCount === 0) {
    return (
      <>
        <BigValue muted>$0</BigValue>
        <SubLine muted>No open positions right now</SubLine>
      </>
    );
  }
  // Round-18 colour rule: only the value strings carry tone; the
  // "ROI" word, the brackets, the labels ("SL", "TP"), the prices,
  // and the separators stay neutral. Centralised in each render
  // block below by wrapping just the value span in a coloured class.
  return (
    <>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className={`font-mono text-2xl font-semibold ${toneFor(unrealized)}`}>
          {fmtBigUsd(unrealized)}
        </p>
        {unrealizedPct !== null && (
          <p className="font-mono text-base font-semibold text-muted-foreground">
            (
            <span className={toneFor(unrealizedPct)}>
              {fmtSignedPct(unrealizedPct)}
            </span>
            <span className="ml-1">ROI</span>)
          </p>
        )}
      </div>
      <SlTpExposureLine openTrades={openTrades} />
    </>
  );
}

// ---------------------------------------------------------------------------
// SL/TP exposure — Round 17.
//
// Per-trade rows under the headline, separated from the headline by a
// horizontal divider. Each row carries price + $ outcome + % distance
// to the live mark:
//
//   SL 80,010 (-$125) -1.3%  ·  TP 82,100 (+$257) +2.0%
//
// Single open trade → one row. Multiple trades → one row per trade,
// each prefixed with the symbol so members can match positions. If a
// trade has neither SL nor TP and no qty data, the row is skipped.
// Generic: reads everything from YourTrade fields shaped by the
// adapter chain — no exchange-specific assumptions.
// ---------------------------------------------------------------------------

function SlTpExposureLine({ openTrades }: { openTrades: YourTrade[] }) {
  // Filter out trades that have nothing useful to surface.
  const rows = openTrades.filter(
    (t) => t.slPrice !== null || t.tpPrice !== null,
  );
  if (rows.length === 0) {
    // Last-resort aggregate (no per-trade SL/TP) — still try the $-only
    // summary so the card isn't completely empty for backends that
    // omit SL/TP entirely.
    const { slLossUsd, tpGainUsd } = aggregateExposure(openTrades);
    if (slLossUsd === null && tpGainUsd === null) return null;
    return (
      <p className="mt-2 flex flex-col gap-y-1 border-t border-border/60 pt-2 font-mono text-[11px] sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2.5">
        {slLossUsd !== null && (
          <span className="inline-flex items-baseline gap-1">
            <span className="text-muted-foreground">SL exposure</span>
            <span className="text-red-300">{fmtSignedUsd(slLossUsd)}</span>
          </span>
        )}
        {slLossUsd !== null && tpGainUsd !== null && (
          <span
            aria-hidden
            className="hidden text-muted-foreground sm:inline"
          >
            ·
          </span>
        )}
        {tpGainUsd !== null && (
          <span className="inline-flex items-baseline gap-1">
            <span className="text-muted-foreground">TP target</span>
            <span className="text-emerald">{fmtSignedUsd(tpGainUsd)}</span>
          </span>
        )}
      </p>
    );
  }

  const showSymbol = rows.length > 1;
  return (
    <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
      {rows.map((t) => (
        <TradeExposureRow
          key={t.id}
          trade={t}
          showSymbol={showSymbol}
        />
      ))}
    </div>
  );
}

function TradeExposureRow({
  trade,
  showSymbol,
}: {
  trade: YourTrade;
  showSymbol: boolean;
}) {
  const slPnl = pnlAtPrice(trade, trade.slPrice);
  const tpPnl = pnlAtPrice(trade, trade.tpPrice);

  // Round-18 mobile: SL and TP sides stack on narrow viewports
  // (flex-col), sit on one line at sm+ (flex-row). The "·" separator
  // is only rendered for the sm+ horizontal layout — it would float
  // awkwardly between stacked rows.
  return (
    <p className="flex flex-col gap-y-1 font-mono text-[11px] sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2.5">
      {showSymbol && (
        <span className="text-muted-foreground">{trade.symbol}</span>
      )}
      {trade.slPrice !== null && (
        <ExposureLeg
          label="SL"
          price={trade.slPrice}
          dollar={slPnl}
          tone="text-red-300"
        />
      )}
      {trade.slPrice !== null && trade.tpPrice !== null && (
        <span
          aria-hidden
          className="hidden text-muted-foreground sm:inline"
        >
          ·
        </span>
      )}
      {trade.tpPrice !== null && (
        <ExposureLeg
          label="TP"
          price={trade.tpPrice}
          dollar={tpPnl}
          tone="text-emerald"
        />
      )}
    </p>
  );
}

// Round-18 colour rule: label + price + brackets stay neutral. Only
// the $ value carries the tone. Round-19 spec change: distance % is
// dropped from the Top-Card row — the modal still surfaces SL/TP
// distance in its own dedicated cards, but the dashboard top-line
// stays compact with just price + $-outcome.
function ExposureLeg({
  label,
  price,
  dollar,
  tone,
}: {
  label: string;
  price: number;
  dollar: number | null;
  tone: string;
}) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{fmtPriceCompact(price)}</span>
      {dollar !== null && (
        <span className="text-muted-foreground">
          (<span className={tone}>{fmtUsdSuffix(dollar)}</span>)
        </span>
      )}
    </span>
  );
}

// Round-17: compact price formatter for the SL/TP row — drops the
// fractional part on values ≥ 1000 so "80,010.40" reads as "80,010"
// (the cents don't earn the row's tight horizontal budget).
function fmtPriceCompact(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// Round-18: $-suffix sign format per Paul's spec — "-267$" / "+235$"
// rather than the conventional "$-267" / "+$235". Brackets are added
// by the caller so the value-span itself is exactly what gets coloured.
function fmtUsdSuffix(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const v = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${sign}${v}$`;
}

// Kept for the aggregate-fallback path in SlTpExposureLine — Paul's
// brief lets us stay with the conventional "$N" form when we can't
// produce a per-trade breakdown.
function fmtSignedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const v = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `${sign}$${v}`;
}
