"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconChartCandle,
  IconChevronLeft,
  IconChevronRight,
  IconPlugConnected,
  IconUserCheck,
} from "@tabler/icons-react";
import { timeAgo } from "@/lib/format";
import { pnlAtPrice } from "@/lib/trades";
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
    return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtSignedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const abs = Math.abs(n).toLocaleString("en-US", {
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
  const abs = Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return `${sign}$${abs}`;
}

function fmtCompactPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(2)}`;
}

// Price formatter for the SL/TP cluster — drops decimals for round
// values ≥1000 so "75,000" reads tightly next to its $-exposure
// bracket. Distinct from fmtPrice (always 2 decimals — used for the
// execution-precise Entry value) and fmtCompactPrice ($-prefixed,
// decimals kept).
function fmtPriceTight(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000)
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

// $-suffix sign format — "−267$" / "+235$" with the Unicode minus.
// Brackets are added by the caller so the value-span itself is exactly
// what gets coloured. Mirrors fmtUsdSuffix in MemberStatsCards so the
// OpenTradeCard SL/TP line reads identically to the top-card line.
function fmtUsdSuffix(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const v = Math.abs(n).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return `${sign}${v}$`;
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
    <div className="min-w-0 space-y-2">
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
      ) : trades.length === 1 ? (
        <OpenTradeCard
          trade={trades[0]}
          hideUsd={hideUsd}
          onClick={() => onSelect(trades[0])}
        />
      ) : (
        <OpenTradesCarousel
          trades={trades}
          hideUsd={hideUsd}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Round-20 OpenTradeCard — vertical card with prices, not distances.
//
// Member sees the static contract (entry / SL / TP prices) at a glance.
// PnL % + $ are the only coloured values; labels and prices stay
// neutral per the dashboard-wide colour rule. The mark price moved
// inside the implicit PnL % calculation — surfacing it again here
// would just duplicate the same information.
// ---------------------------------------------------------------------------

function OpenTradeCard({
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
  const leverage = trade.leverage;

  // Round-24: $-outcome at the SL/TP price, same compute path as the
  // top-card SlTpExposureLine. Only own positions surface USD — Paul's
  // trades strip USD server-side, hideUsd gates accordingly.
  const slPnl =
    !hideUsd && trade.owner === "self"
      ? pnlAtPrice(trade, trade.slPrice)
      : null;
  const tpPnl =
    !hideUsd && trade.owner === "self"
      ? pnlAtPrice(trade, trade.tpPrice)
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center gap-2">
        <p className="truncate font-mono text-sm font-semibold text-foreground">
          {trade.symbol}
        </p>
        <SideBadge side={trade.side} leverage={leverage} />
        <span
          className="ml-auto font-mono text-[10px] text-muted-foreground"
          suppressHydrationWarning
        >
          {trade.durationLabel}
        </span>
      </div>

      {/* Round-25: classic trader hierarchy — absolute $ first and
          large, % as secondary detail beside it. When USD is hidden
          (Paul's trades / hideUsd) we fall back to % as the primary
          value so the row isn't empty. */}
      <div className="mt-2 flex items-baseline gap-3">
        {!hideUsd && trade.owner === "self" ? (
          <>
            <span className={`font-mono text-lg font-semibold ${tone}`}>
              {fmtSignedUsd(trade.pnlUsd)}
            </span>
            <span className={`font-mono text-sm ${tone}`}>
              {fmtSignedPct(trade.pnlPct)}
            </span>
          </>
        ) : (
          <span className={`font-mono text-lg font-semibold ${tone}`}>
            {fmtSignedPct(trade.pnlPct)}
          </span>
        )}
      </div>

      {/* Round-24: replaced the equal-spaced 3-col grid with a flex row
          that puts Entry on its own and clusters SL + TP with a
          tighter gap, mirroring the top-card SL/TP exposure line.
          Each SL/TP leg also carries its $-outcome in coloured
          parens. */}
      <dl className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px]">
        <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
          <dt className="text-muted-foreground">Entry</dt>
          <dd className="text-foreground">{fmtPrice(trade.entry)}</dd>
        </div>

        <div className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <dt className="text-muted-foreground">SL</dt>
            <dd className="text-foreground">{fmtPriceTight(trade.slPrice)}</dd>
            {slPnl !== null && (
              <span className="text-muted-foreground">
                (
                <span
                  className={slPnl > 0 ? "text-emerald" : "text-red-300"}
                >
                  {fmtUsdSuffix(slPnl)}
                </span>
                )
              </span>
            )}
          </div>
          <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <dt className="text-muted-foreground">TP</dt>
            <dd className="text-foreground">{fmtPriceTight(trade.tpPrice)}</dd>
            {tpPnl !== null && (
              <span className="text-muted-foreground">
                (<span className="text-emerald">{fmtUsdSuffix(tpPnl)}</span>)
              </span>
            )}
          </div>
        </div>
      </dl>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Round-20/21 — horizontal swipe carousel for multi-trade open lists.
//
// Pure CSS scroll-snap (no embla/swiper). Each card is `snap-start
// shrink-0` so the browser's native momentum-scroll snaps to cards
// on touch + trackpad. Round-21 layered on:
//   · arrow buttons on desktop (sm+) for click-to-scroll
//   · ArrowLeft / ArrowRight keyboard handlers on the scroller
//   · for 2–3 trades, cards size so the row fits without scroll on
//     desktop — effectively a grid; arrows auto-disable at boundary
//     and dots stay (useful indicator even when no scroll)
// ---------------------------------------------------------------------------

function OpenTradesCarousel({
  trades,
  hideUsd,
  onSelect,
}: {
  trades: AnyTrade[];
  hideUsd: boolean;
  onSelect: (t: AnyTrade) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const cardWidth = first.getBoundingClientRect().width;
    if (cardWidth <= 0) return;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(Math.max(idx, 0), trades.length - 1));

    // Boundary check for arrow-button disabled state. 1px tolerance
    // for sub-pixel rounding.
    setCanScrollPrev(el.scrollLeft > 1);
    setCanScrollNext(
      el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    );
  }, [trades.length]);

  // Re-measure on mount + when trade count changes (e.g. new position
  // pushed in via polling) so the arrow-disabled state stays accurate.
  useEffect(() => {
    measure();
  }, [measure, trades.length]);

  const scrollToIndex = (idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return;
    const cardWidth = first.getBoundingClientRect().width;
    el.scrollTo({ left: cardWidth * idx, behavior: "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" && activeIdx > 0) {
      e.preventDefault();
      scrollToIndex(activeIdx - 1);
    } else if (e.key === "ArrowRight" && activeIdx < trades.length - 1) {
      e.preventDefault();
      scrollToIndex(activeIdx + 1);
    }
  };

  // Round-21b mobile width-fix: `min-w-0` on the outer wrappers so a
  // grid/flex parent can't be forced wider by the carousel's content.
  // Dropped the `-mx-1 px-1` trick that pushed the scroll-area 4px past
  // each section edge — on a 390px viewport that 8px overhang made the
  // chat below feel mis-aligned. Cards size with
  // `basis-full grow-0 shrink-0` instead of `w-full` so the flex basis
  // is resolved against the scroller's measured width (not via
  // circular `width: 100%` of an auto-sized flex container).
  return (
    <div className="relative min-w-0 space-y-2">
      <div className="relative min-w-0">
        {/* Left arrow — desktop only, hidden when at start. */}
        <CarouselArrow
          direction="left"
          disabled={!canScrollPrev}
          onClick={() => scrollToIndex(Math.max(activeIdx - 1, 0))}
        />

        <div
          ref={scrollerRef}
          onScroll={measure}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="region"
          aria-label="Open trades carousel"
          className="flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scroll-smooth [&::-webkit-scrollbar]:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald"
          style={{ scrollbarWidth: "none" }}
        >
          {trades.map((t) => (
            <div
              key={t.id}
              className="snap-start basis-full grow-0 shrink-0 sm:basis-[300px]"
            >
              <OpenTradeCard
                trade={t}
                hideUsd={hideUsd}
                onClick={() => onSelect(t)}
              />
            </div>
          ))}
        </div>

        <CarouselArrow
          direction="right"
          disabled={!canScrollNext}
          onClick={() =>
            scrollToIndex(Math.min(activeIdx + 1, trades.length - 1))
          }
        />
      </div>

      {/* Indicator dots — show when 2+ trades. Useful even on desktop
          when no scrolling is needed because they still indicate
          "which trade you're focused on" for keyboard nav. */}
      <div
        role="tablist"
        aria-label="Open trades pagination"
        className="flex justify-center gap-1.5"
      >
        {trades.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={i === activeIdx}
            aria-label={`Show trade ${i + 1} of ${trades.length}: ${t.symbol}`}
            title={t.symbol}
            onClick={() => scrollToIndex(i)}
            className={[
              "h-1.5 rounded-full transition-all",
              i === activeIdx
                ? "w-6 bg-emerald"
                : "w-1.5 bg-border hover:bg-muted-foreground/40",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function CarouselArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? IconChevronLeft : IconChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous trade" : "Next trade"}
      className={[
        "absolute top-1/2 z-10 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background shadow-md transition-all sm:flex",
        direction === "left" ? "-left-3" : "-right-3",
        disabled
          ? "cursor-not-allowed opacity-0"
          : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      ].join(" ")}
    >
      <Icon size={16} stroke={2} aria-hidden />
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
  // Privacy: when hideUsd is true, this section is rendering Paul's
  // trades — also hide the trade-id column and the "X total" count
  // badge so members can't infer how many trades Paul has taken.
  const hideId = hideUsd;
  const hideCount = hideUsd;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
          Last 5 trades
        </p>
        {!hideCount && trades.length > 0 && (
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
                  {!hideId && (
                    <th scope="col" className="px-3 py-2 text-left">Trade #</th>
                  )}
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
                {trades.map((t) => (
                  <LastTradeRow
                    key={t.id}
                    trade={t}
                    hideUsd={hideUsd}
                    hideId={hideId}
                    onClick={() => onSelect(t)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card stack */}
          <div className="space-y-1.5 sm:hidden">
            {trades.map((t) => (
              <LastTradeCard
                key={t.id}
                trade={t}
                hideUsd={hideUsd}
                hideId={hideId}
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
  hideUsd,
  hideId,
  onClick,
}: {
  trade: AnyTrade;
  hideUsd: boolean;
  hideId: boolean;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";
  // The DB row id is never user-facing — only the backend's per-user
  // `trade_number` is. When it isn't present we render an em-dash so
  // we don't substitute a positional index that could be mistaken for
  // a real trade number.
  const idLabel =
    typeof trade.tradeNumber === "number"
      ? `#${trade.tradeNumber}`
      : "—";
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-surface/40"
    >
      {!hideId && (
        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
          {idLabel}
        </td>
      )}
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
        <td
          className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${tone}`}
        >
          {trade.owner === "self" ? fmtSignedUsd(trade.pnlUsd) : "—"}
        </td>
      )}
      <td
        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${tone}`}
      >
        {fmtSignedPct(trade.pnlPct)}
      </td>
      <td
        className="px-3 py-2 text-right text-xs text-muted-foreground"
        suppressHydrationWarning
      >
        {trade.closedAt ? timeAgo(trade.closedAt) : trade.durationLabel}
      </td>
    </tr>
  );
}

function LastTradeCard({
  trade,
  hideUsd,
  hideId,
  onClick,
}: {
  trade: AnyTrade;
  hideUsd: boolean;
  hideId: boolean;
  onClick: () => void;
}) {
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";
  // Same rule as LastTradeRow — never substitute the raw DB id or a
  // positional index for a missing per-user trade_number.
  const idLabel =
    typeof trade.tradeNumber === "number"
      ? `#${trade.tradeNumber}`
      : "—";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-foreground/20"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!hideId && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {idLabel}
            </span>
          )}
          <p className="truncate font-mono text-sm font-medium text-foreground">
            {trade.symbol}
          </p>
          <SideBadge side={trade.side} leverage={trade.leverage} />
        </div>
        <span
          className="text-[10px] text-muted-foreground"
          suppressHydrationWarning
        >
          {trade.closedAt ? timeAgo(trade.closedAt) : trade.durationLabel}
        </span>
      </div>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        {fmtPrice(trade.entry)} → {fmtPrice(trade.exit)}
      </p>
      <div className="mt-2 flex items-center justify-end gap-3">
        {!hideUsd && trade.owner === "self" && (
          <span className={`whitespace-nowrap font-mono text-sm ${tone}`}>
            {fmtSignedUsd(trade.pnlUsd)}
          </span>
        )}
        <span
          className={`whitespace-nowrap font-mono text-sm font-semibold ${tone}`}
        >
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
    return <ConnectExchangeColdStart />;
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
  return (
    <ColdStart
      tone="emerald"
      Icon={IconChartCandle}
      title="No trades yet"
      body="Once you open a position, your trade will appear here. Aven tracks it live, alerts you on risks, and reviews it after close."
    />
  );
}

// Clickable empty-state for members who haven't linked an exchange yet —
// whole card navigates to Settings → Exchange API. The nested "Connect
// exchange" pill is decorative; the surrounding Link captures clicks.
function ConnectExchangeColdStart() {
  return (
    <Link
      href="/dashboard/settings#exchange-api"
      aria-label="Connect your exchange in Settings"
      className="group flex flex-col items-center gap-4 rounded-lg border border-dashed border-emerald/40 bg-gradient-to-br from-surface to-emerald/[0.05] px-6 py-10 text-center transition-all hover:border-emerald/70 hover:bg-emerald/[0.08] hover:shadow-[0_0_30px_-8px_rgba(16,185,129,0.35)]"
    >
      <span className="inline-flex size-14 items-center justify-center rounded-full bg-emerald/[0.12] text-emerald transition-transform group-hover:scale-105">
        <IconPlugConnected size={26} stroke={1.5} aria-hidden />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">
          No trades yet
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Once you connect your exchange and open a position, your
          trade will appear here. Aven tracks it live, alerts you on
          risks, and reviews it after close.
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-5 py-2.5 text-sm font-medium text-background transition-colors group-hover:bg-emerald-hover">
        Connect exchange
        <IconArrowRight
          size={14}
          stroke={2}
          className="transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
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
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
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
  // Privacy: show win-rate alone — never the closed-trade count, since
  // members shouldn't be able to infer how many trades Paul has taken
  // (combined with the leak from a count this would let them reverse-
  // engineer his daily volume).
  const headerStats =
    winRate !== null ? `Win-Rate ${winRate.toFixed(0)}%` : null;

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
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
