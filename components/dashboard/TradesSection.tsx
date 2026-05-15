"use client";

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconChartCandle,
  IconPlugConnected,
  IconUserCheck,
} from "@tabler/icons-react";
import { timeAgo } from "@/lib/format";
import type {
  AnyTrade,
  TradesStats,
  YourTradesMeta,
} from "@/lib/trades";

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function fmtPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtSignedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
  return `${sign}$${abs}`;
}

function fmtSignedPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
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

function fmtCompactPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(2)}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Side badge with optional leverage suffix
// ---------------------------------------------------------------------------

function SideBadge({
  side,
  leverage,
}: {
  side: "long" | "short";
  leverage?: number | null;
}) {
  const tone =
    side === "long"
      ? "bg-emerald/[0.12] text-emerald"
      : "bg-red-500/[0.12] text-red-300";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] uppercase ${tone}`}
    >
      {side}
      {leverage && (
        <span className="opacity-90">{Math.round(leverage)}x</span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Top cards (3 horizontal: Symbol+Price · Unrealized · Realized)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Open trades panel — list of cards (or empty)
// (Top-Cards moved to dashboard-level MemberStatsCards in round-8.)
// ---------------------------------------------------------------------------

function OpenTradesPanel({
  trades,
  hideUsd,
  onSelect,
}: {
  trades: AnyTrade[];
  hideUsd: boolean;
  onSelect: (t: AnyTrade) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Open trades
        </p>
        <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {trades.length}
        </span>
      </div>
      {trades.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-muted-foreground">
          No open trades
        </p>
      ) : (
        <div className="space-y-1.5">
          {trades.map((t) => (
            <OpenTradeRow
              key={t.id}
              trade={t}
              hideUsd={hideUsd}
              onClick={() => onSelect(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OpenTradeRow({
  trade,
  hideUsd,
  onClick,
}: {
  trade: AnyTrade;
  hideUsd: boolean;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";
  const leverage =
    trade.owner === "self" ? trade.leverage : trade.leverage;
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
          <SideBadge side={trade.side} leverage={leverage} />
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {fmtPrice(trade.entry)} → {fmtPrice(trade.mark)} ·{" "}
          {trade.durationLabel}
        </p>
        {(trade.slDistancePct !== null || trade.tpDistancePct !== null) && (
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

      <div className={`text-right ${tone}`}>
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          ROI
        </div>
        <div className="flex items-center justify-end gap-1 font-mono text-sm font-semibold">
          {positive ? (
            <IconArrowUpRight size={14} stroke={2} aria-hidden />
          ) : (
            <IconArrowDownRight size={14} stroke={2} aria-hidden />
          )}
          {fmtSignedPct(trade.pnlPct)}
        </div>
      </div>
      {!hideUsd && trade.owner === "self" && (
        <div className={`hidden text-right sm:block ${tone}`}>
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            USD
          </div>
          <div className="font-mono text-sm">{fmtSignedUsd(trade.pnlUsd)}</div>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Last 5 trades — table on sm+, card stack on mobile
// ---------------------------------------------------------------------------

function LastTradesTable({
  trades,
  hideUsd,
  onSelect,
}: {
  trades: AnyTrade[];
  hideUsd: boolean;
  onSelect: (t: AnyTrade) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Last 5 trades
        </p>
        {trades.length > 0 && (
          <span className="rounded-md bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {trades.length} total
          </span>
        )}
      </div>

      {trades.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-background px-4 py-5 text-center text-sm text-muted-foreground">
          No closed trades yet
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border border-border sm:block">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left">ID</th>
                  <th scope="col" className="px-3 py-2 text-left">Symbol</th>
                  <th scope="col" className="px-3 py-2 text-left">Side</th>
                  <th scope="col" className="px-3 py-2 text-right">Entry</th>
                  <th scope="col" className="px-3 py-2 text-right">Exit</th>
                  {!hideUsd && (
                    <th scope="col" className="px-3 py-2 text-right">PnL</th>
                  )}
                  <th scope="col" className="px-3 py-2 text-right">ROI</th>
                  <th scope="col" className="px-3 py-2 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trades.map((t, i) => (
                  <LastTradeRow
                    key={t.id}
                    trade={t}
                    fallbackIndex={i + 1}
                    hideUsd={hideUsd}
                    onClick={() => onSelect(t)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card stack */}
          <div className="space-y-1.5 sm:hidden">
            {trades.map((t, i) => (
              <LastTradeCard
                key={t.id}
                trade={t}
                fallbackIndex={i + 1}
                hideUsd={hideUsd}
                onClick={() => onSelect(t)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LastTradeRow({
  trade,
  fallbackIndex,
  hideUsd,
  onClick,
}: {
  trade: AnyTrade;
  fallbackIndex: number;
  hideUsd: boolean;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";
  const idLabel =
    typeof trade.tradeNumber === "number"
      ? `#${trade.tradeNumber}`
      : `#${fallbackIndex}`;
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-surface/40"
    >
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
        {idLabel}
      </td>
      <td className="px-3 py-2 font-mono text-sm font-medium text-foreground">
        {trade.symbol}
      </td>
      <td className="px-3 py-2">
        <SideBadge side={trade.side} leverage={trade.leverage} />
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-foreground">
        {fmtPrice(trade.entry)}
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm text-foreground">
        {fmtPrice(trade.exit)}
      </td>
      {!hideUsd && (
        <td className={`px-3 py-2 text-right font-mono text-sm ${tone}`}>
          {trade.owner === "self" ? fmtSignedUsd(trade.pnlUsd) : "—"}
        </td>
      )}
      <td className={`px-3 py-2 text-right font-mono text-sm ${tone}`}>
        {fmtSignedPct(trade.pnlPct)}
      </td>
      <td className="px-3 py-2 text-right text-xs text-muted-foreground">
        {trade.closedAt ? timeAgo(trade.closedAt) : trade.durationLabel}
      </td>
    </tr>
  );
}

function LastTradeCard({
  trade,
  fallbackIndex,
  hideUsd,
  onClick,
}: {
  trade: AnyTrade;
  fallbackIndex: number;
  hideUsd: boolean;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";
  const idLabel =
    typeof trade.tradeNumber === "number"
      ? `#${trade.tradeNumber}`
      : `#${fallbackIndex}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[10px] text-muted-foreground">
            {idLabel}
          </span>
          <p className="truncate font-mono text-sm font-medium text-foreground">
            {trade.symbol}
          </p>
          <SideBadge side={trade.side} leverage={trade.leverage} />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {trade.closedAt ? timeAgo(trade.closedAt) : trade.durationLabel}
        </span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {fmtPrice(trade.entry)} → {fmtPrice(trade.exit)}
      </p>
      <div className="mt-2 flex items-center justify-end gap-3">
        {!hideUsd && trade.owner === "self" && (
          <span className={`font-mono text-sm ${tone}`}>
            {fmtSignedUsd(trade.pnlUsd)}
          </span>
        )}
        <span className={`font-mono text-sm font-semibold ${tone}`}>
          {fmtSignedPct(trade.pnlPct)}
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Empty-state for member's section (4 cases)
// ---------------------------------------------------------------------------

function YourTradesColdStart({ meta }: { meta: YourTradesMeta }) {
  if (!meta.hasExchange) {
    return (
      <ColdStart
        tone="emerald"
        Icon={IconPlugConnected}
        title="Connect your exchange"
        body="Open Settings → Exchange API and link a read-only key to track your positions here."
      />
    );
  }
  const ex = meta.exchangeType?.toLowerCase() ?? null;
  if (ex === "bitunix") {
    return (
      <ColdStart
        tone="amber"
        Icon={IconChartCandle}
        title="Bitunix tracking coming soon"
        body="Multi-exchange support is in development — your Bitunix positions will appear here once it lands."
      />
    );
  }
  const exchangeLabel = ex ? capitalize(ex) : "your exchange";
  return (
    <ColdStart
      tone="emerald"
      Icon={IconChartCandle}
      title="No positions yet"
      body={`Start trading on ${exchangeLabel} — your live PnL appears here as soon as a position opens.`}
    />
  );
}

function ColdStart({
  tone,
  Icon,
  title,
  body,
}: {
  tone: "emerald" | "amber";
  Icon: React.ComponentType<{
    size?: number;
    stroke?: number;
    "aria-hidden"?: boolean;
  }>;
  title: string;
  body: string;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-amber-500/30 bg-amber-500/[0.04]"
      : "border-border bg-background";
  const iconClasses =
    tone === "amber"
      ? "bg-amber-500/[0.12] text-amber-300"
      : "bg-emerald/[0.08] text-emerald";
  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center ${toneClasses}`}
    >
      <span
        className={`inline-flex size-12 items-center justify-center rounded-full ${iconClasses}`}
      >
        <Icon size={22} stroke={1.5} aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public API — orchestrator
// ---------------------------------------------------------------------------

interface CommonProps {
  active: AnyTrade[];
  recent: AnyTrade[];
  stats: TradesStats;
  onSelect: (t: AnyTrade) => void;
}

export function MyTradesSection({
  active,
  recent,
  meta,
  onSelect,
}: CommonProps & { meta?: YourTradesMeta }) {
  const empty = active.length === 0 && recent.length === 0;
  const showColdStart = empty && meta !== undefined;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Your trades
        </h2>
      </header>

      {showColdStart ? (
        <YourTradesColdStart meta={meta} />
      ) : (
        <>
          <OpenTradesPanel
            trades={active}
            hideUsd={false}
            onSelect={onSelect}
          />
          <LastTradesTable
            trades={recent}
            hideUsd={false}
            onSelect={onSelect}
          />
        </>
      )}
    </section>
  );
}

export function PaulsTradesSection({
  active,
  recent,
  stats,
  onSelect,
}: CommonProps) {
  const winRate = stats.winRatePct;
  const closed = stats.closedCount;
  const headerStats =
    winRate !== null && closed !== null
      ? `Win-Rate ${winRate.toFixed(0)}% · ${closed} closed`
      : null;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Paul&apos;s trades
          </h2>
          {headerStats && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {headerStats}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
          <IconUserCheck size={12} stroke={2} />
          Following Paul
        </span>
      </header>

      {active.length === 0 && recent.length === 0 ? (
        <ColdStart
          tone="emerald"
          Icon={IconChartCandle}
          title="Paul has no open positions"
          body="Last 5 trades will appear here once Paul takes a setup."
        />
      ) : (
        <>
          <OpenTradesPanel
            trades={active}
            hideUsd
            onSelect={onSelect}
          />
          <LastTradesTable
            trades={recent}
            hideUsd
            onSelect={onSelect}
          />
        </>
      )}
    </section>
  );
}
