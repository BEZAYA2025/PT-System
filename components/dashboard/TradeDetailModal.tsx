"use client";

import { IconBulb, IconChartCandle } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { timeAgo } from "@/lib/format";
import type { AnyTrade } from "@/lib/trades";

function fmtPrice(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtSignedUsd(n: number): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  const v = Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
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
        {/* Headline KPIs */}
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 font-mono text-[11px] uppercase ${sideTone}`}
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
            <span className={`font-mono text-sm ${tone}`}>
              {fmtSignedUsd(trade.pnlUsd)}
            </span>
          )}
        </div>

        {/* Price grid */}
        <div className="grid gap-3 sm:grid-cols-4">
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
            tone="text-red-300"
          />
          <DetailField
            label="Take profit"
            value={fmtPrice(trade.tpPrice)}
            tone="text-emerald"
          />
        </div>

        {/* Distance + duration */}
        {trade.status === "open" && (
          <div className="grid gap-3 sm:grid-cols-3">
            <DetailField
              label="SL distance"
              value={
                trade.slDistancePct !== null
                  ? `${trade.slDistancePct.toFixed(2)}%`
                  : "—"
              }
              tone="text-red-300"
            />
            <DetailField
              label="TP distance"
              value={
                trade.tpDistancePct !== null
                  ? `${trade.tpDistancePct.toFixed(2)}%`
                  : "—"
              }
              tone="text-emerald"
            />
            <DetailField
              label="In trade"
              value={trade.durationLabel}
            />
          </div>
        )}

        {trade.status === "closed" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Duration" value={trade.durationLabel} />
            <DetailField
              label="Closed"
              value={trade.closedAt ? timeAgo(trade.closedAt) : "—"}
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

        {/* Chart placeholder */}
        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface/40 px-4 py-5 text-sm text-muted-foreground">
          <IconChartCandle size={18} stroke={1.5} aria-hidden />
          <span>Mini-chart lands in iteration 7 alongside real-time data.</span>
        </div>
      </div>
    </Modal>
  );
}

function DetailField({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-mono text-sm font-semibold ${tone ?? "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
