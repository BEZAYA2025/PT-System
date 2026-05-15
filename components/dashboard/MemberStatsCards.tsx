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
  const [openCount, setOpenCount] = useState<number>(0);
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
        setOpenCount(view.your.active.length);
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
          openCount={openCount}
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
  openCount,
  unrealized,
  unrealizedPct,
}: {
  credentialStatus: CredentialStatus | undefined;
  connected: boolean;
  openCount: number;
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
  if (openCount === 0) {
    return (
      <>
        <BigValue muted>$0</BigValue>
        <SubLine muted>No open positions right now</SubLine>
      </>
    );
  }
  return (
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
        <span>
          across {openCount} open position{openCount === 1 ? "" : "s"}
        </span>
      </SubLine>
    </>
  );
}
