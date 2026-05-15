"use client";

import { IconBulb, IconClock } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { timeAgo } from "@/lib/format";
import {
  pctDistanceFromMark,
  pnlAtPrice,
  type AnyTrade,
  type YourTrade,
} from "@/lib/trades";

function fmtPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtSignedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const v = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 2 });
  return `${sign}$${v}`;
}

function fmtSignedPct(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

function fmtSignedR(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}R`;
}

function fmtIsoUtc(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const date = d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
      hour12: false,
    });
    return `${date} · ${time} UTC`;
  } catch {
    return "—";
  }
}

export function TradeDetailModal({
  trade,
  onClose,
}: {
  trade: AnyTrade | null;
  onClose: () => void;
}) {
  if (!trade) return null;

  const isPaul = trade.owner === "paul";
  const positive = trade.pnlPct >= 0;
  const tone = positive ? "text-emerald" : "text-red-300";
  const sideTone =
    trade.side === "long"
      ? "bg-emerald/[0.1] text-emerald"
      : "bg-red-500/[0.1] text-red-300";

  const title = `${trade.symbol} · ${trade.side.toUpperCase()}`;
  const subtitle = isPaul
    ? `Paul's trade · ${trade.status === "open" ? "Active" : "Closed"}`
    : `Your trade · ${trade.status === "open" ? "Active" : "Closed"}`;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={title}
      description={subtitle}
      size="lg"
    >
      <div className="space-y-5">
        {/* Headline KPIs — Round-15 hierarchy: % is the headline,
            $ amount drops to a subtler secondary line so the
            same-coloured percent isn't competing with itself. */}
        <div className="flex flex-wrap items-baseline gap-3">
          <span
            className={`inline-flex items-center self-center rounded-md px-2 py-0.5 font-mono text-[11px] uppercase ${sideTone}`}
          >
            {trade.side}
          </span>
          <span className={`font-mono text-2xl font-semibold ${tone}`}>
            {fmtSignedPct(trade.pnlPct)}
          </span>
          {isPaul ? (
            trade.pnlR !== null ? (
              <span className={`font-mono text-sm ${tone}`}>
                {fmtSignedR(trade.pnlR)}
              </span>
            ) : null
          ) : (
            <span className={`font-mono text-base ${tone} opacity-80`}>
              {fmtSignedUsd(trade.pnlUsd)}
            </span>
          )}
        </div>

        {/* Trade-timeline panel — prominent for closed trades, especially
         *  Paul's, so members see the holding-period at a glance. */}
        <TradeTimeline trade={trade} />

        {/* Price grid — SL + TP cards carry the $ outcome below the
            price so the member sees risk/reward at a glance.
            Round-18 mobile: 2×2 on narrow viewports instead of 4
            stacked rows so the modal stays a reasonable height on
            phone screens. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailField label="Entry" value={fmtPrice(trade.entry)} />
          <DetailField
            label={trade.status === "open" ? "Mark" : "Exit"}
            value={
              trade.status === "open"
                ? fmtPrice(trade.mark)
                : fmtPrice(trade.exit)
            }
          />
          <DetailField
            label="Stop loss"
            value={fmtPrice(trade.slPrice)}
            footer={
              !isPaul && trade.status === "open"
                ? formatExposure(pnlAtPrice(trade as YourTrade, trade.slPrice))
                : null
            }
            footerTone="text-red-300"
          />
          <DetailField
            label="Take profit"
            value={fmtPrice(trade.tpPrice)}
            footer={
              !isPaul && trade.status === "open"
                ? formatExposure(pnlAtPrice(trade as YourTrade, trade.tpPrice))
                : null
            }
            footerTone="text-emerald"
          />
        </div>

        {/* Distance grid (open trades only — duration is in TradeTimeline).
            Round-15: when the shaper's slDistancePct comes through as
            null (older mark missing, etc.) recompute from the modal
            side so the row never falls back to "—" with full data
            available.
            Round-18: each Distance card now also shows the absolute
            price delta ("-1,051$") under the % so members see both
            "how far in %" and "how far in $". Value tones flip per
            Paul's rule — only the numeric value carries the colour. */}
        {trade.status === "open" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField
              label="SL distance"
              value={
                formatDistance(
                  trade.slDistancePct ??
                    (isPaul
                      ? null
                      : pctDistanceFromMark(trade as YourTrade, trade.slPrice)),
                )
              }
              tone="text-red-300"
              footer={formatPriceDelta(trade.mark, trade.slPrice)}
              footerTone="text-red-300"
            />
            <DetailField
              label="TP distance"
              value={
                formatDistance(
                  trade.tpDistancePct ??
                    (isPaul
                      ? null
                      : pctDistanceFromMark(trade as YourTrade, trade.tpPrice)),
                )
              }
              tone="text-emerald"
              footer={formatPriceDelta(trade.tpPrice, trade.mark)}
              footerTone="text-emerald"
            />
          </div>
        )}

        {/* Paul-only reasoning section */}
        {isPaul && trade.reasoning && (
          <div className="rounded-lg border border-emerald/20 bg-emerald/[0.04] p-4">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald">
              <IconBulb size={14} stroke={1.75} aria-hidden />
              Paul&apos;s reasoning
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground">
              {trade.reasoning}
            </p>
          </div>
        )}

      </div>
    </Modal>
  );
}

function DetailField({
  label,
  value,
  tone,
  footer,
  footerTone,
}: {
  label: string;
  value: string;
  tone?: string;
  /** Round-15: optional small line under the value (e.g. "+$205.00"
   *  on a Take-profit card showing the $ outcome if TP hits). */
  footer?: string | null;
  footerTone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm font-semibold ${tone ?? "text-foreground"}`}
      >
        {value}
      </p>
      {footer && (
        <p
          className={`mt-0.5 font-mono text-[11px] ${footerTone ?? "text-muted-foreground"} opacity-90`}
        >
          {footer}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny formatters — Round-15 SL/TP exposure + distance display.
// ---------------------------------------------------------------------------

/** Format the SL/TP $ outcome line as "(-267$)" / "(+235$)" per
 *  Round-18 spec: number-then-$-suffix, wrapped in brackets. Caller
 *  decides which span is coloured. */
function formatExposure(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) return null;
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const v = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return `(${sign}${v}$)`;
}

/** SL / TP distance display. Renders "—" only when both the shaped
 *  field and the recomputed value were null. */
function formatDistance(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : pct < 0 ? "−" : "";
  return `${sign}${Math.abs(pct).toFixed(2)}%`;
}

/** Round-18: absolute price delta from `from` to `to`, signed and
 *  $-suffixed ("-1,051$"). Null when either side is missing. Used by
 *  the Distance cards to surface the $-delta below the %. */
function formatPriceDelta(
  to: number | null,
  from: number | null,
): string | null {
  if (
    to === null ||
    from === null ||
    !Number.isFinite(to) ||
    !Number.isFinite(from)
  ) {
    return null;
  }
  const delta = to - from;
  if (!Number.isFinite(delta)) return null;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const v = Math.abs(delta).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });
  return `${sign}${v}$`;
}

function TradeTimeline({ trade }: { trade: AnyTrade }) {
  const isOpen = trade.status === "open";
  return (
    <div className="rounded-lg border border-border bg-surface/60 p-4">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
        <IconClock size={12} stroke={1.75} aria-hidden />
        Trade timeline
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Opened
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">
            {fmtIsoUtc(trade.openedAt)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {isOpen ? "Status" : "Closed"}
          </p>
          <p className="mt-1 font-mono text-sm text-foreground">
            {isOpen ? "Active" : fmtIsoUtc(trade.closedAt)}
          </p>
        </div>
      </div>

      {/* Held / In-trade — large + emerald, the standout line */}
      <div className="mt-4 flex items-baseline gap-2 border-t border-border pt-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {isOpen ? "In trade" : "Held"}
        </span>
        <span className="font-mono text-lg font-semibold text-emerald">
          {trade.durationLabel}
        </span>
        {!isOpen && trade.closedAt && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            · closed {timeAgo(trade.closedAt)}
          </span>
        )}
      </div>
    </div>
  );
}
