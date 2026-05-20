"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconChartCandle,
  IconCrown,
  IconLoader2,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import type {
  MemberDetail,
  MemberTrade,
  MemberTradeStats,
  MemberTradesResponse,
} from "@/lib/admin";

interface Props {
  member: MemberDetail;
}

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatSignedUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${formatUSD(Math.abs(n))}`;
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function formatRMultiple(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n.toFixed(2)}R`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d`;
  const hrs = Math.floor(seconds / 3600);
  if (hrs > 0) return `${hrs}h`;
  const min = Math.floor(seconds / 60);
  return `${min}m`;
}

const PAGE_SIZE = 25;

export function MemberTradesTab({ member }: Props) {
  const [stats, setStats] = useState<MemberTradeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [trades, setTrades] = useState<MemberTradesResponse | null>(null);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [tradesPending, setTradesPending] = useState(false);
  const [tradesError, setTradesError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<MemberTrade | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/trade-stats`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const inner =
          data && typeof data === "object" && "stats" in data
            ? ((data as { stats: MemberTradeStats }).stats)
            : (data as MemberTradeStats);
        setStats(inner ?? {});
      })
      .catch((err: Error) => {
        if (!cancelled) setStatsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/trades`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        // Endpoint A is rolling out in parallel. A clean 404 from the
        // upstream means "deploy lands shortly" — show a pending pill,
        // don't surface as an error.
        if (r.status === 404) {
          if (!cancelled) setTradesPending(true);
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled || data === null) return;
        const norm = normalizeTrades(data);
        setTrades(norm);
      })
      .catch((err: Error) => {
        if (!cancelled) setTradesError(err.message);
      })
      .finally(() => {
        if (!cancelled) setTradesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  const closed = trades?.closed ?? [];
  const open = trades?.open ?? [];
  const totalPages = Math.max(1, Math.ceil(closed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pagedClosed = closed.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <section>
        {statsError && (
          <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load stats · {statsError}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Total Trades"
            value={
              statsLoading
                ? "—"
                : stats?.total_count !== null && stats?.total_count !== undefined
                  ? stats.total_count.toLocaleString()
                  : "—"
            }
          />
          <StatCard
            label="Win Rate"
            value={statsLoading ? "—" : formatPct(stats?.win_rate)}
          />
          <StatCard
            label="Avg R-Multiple"
            value={
              statsLoading ? "—" : formatRMultiple(stats?.avg_r_multiple)
            }
          />
          <StatCard
            label="Total PnL"
            value={statsLoading ? "—" : formatSignedUSD(stats?.total_pnl_usd)}
            tone={
              (stats?.total_pnl_usd ?? 0) >= 0 ? "emerald" : "red"
            }
          />
          <StatCard
            label="Best / Worst"
            value={
              statsLoading
                ? "—"
                : `${formatSignedUSD(stats?.best_trade?.pnl_usd)} · ${formatSignedUSD(stats?.worst_trade?.pnl_usd)}`
            }
            small
          />
        </div>
      </section>

      {/* Open trades */}
      {!tradesPending && open.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Open trades · {open.length}
            </h2>
          </header>
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {open.map((t) => (
              <OpenTradeCard
                key={t.id}
                trade={t}
                onClick={() => setDetail(t)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Closed trades */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Closed trades
          </h2>
          {!tradesLoading && !tradesPending && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {closed.length.toLocaleString()} trade
              {closed.length === 1 ? "" : "s"}
            </p>
          )}
        </header>

        {tradesLoading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading trades…
          </p>
        ) : tradesPending ? (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3 text-sm">
            <p className="font-medium text-amber-200">
              Endpoint deploying…
            </p>
            <p className="mt-1 text-xs text-amber-200/80">
              The per-member trades endpoint goes live shortly. The
              stats row above is already live — refresh in a minute
              to populate this section.
            </p>
          </div>
        ) : tradesError ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load trades · {tradesError}
          </p>
        ) : closed.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No closed trades yet.
          </p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Symbol</th>
                    <th className="px-3 py-2 font-medium">Side</th>
                    <th className="px-3 py-2 font-medium text-right">Entry</th>
                    <th className="px-3 py-2 font-medium text-right">Exit</th>
                    <th className="px-3 py-2 font-medium text-right">ROI%</th>
                    <th className="px-3 py-2 font-medium text-right">PnL</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedClosed.map((t) => {
                    const pnl = t.pnl_usd ?? 0;
                    const roi = t.roi_pct ?? t.pnl_pct ?? null;
                    const tone =
                      pnl >= 0 ? "text-emerald" : "text-red-300";
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setDetail(t)}
                        className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-surface/60"
                      >
                        <td className="px-3 py-2 font-mono text-foreground">
                          {t.symbol ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs uppercase text-muted-foreground">
                          {t.side ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                          {t.entry ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                          {t.exit ?? "—"}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono text-xs ${tone}`}>
                          {roi !== null ? formatPct(roi) : "—"}
                        </td>
                        <td className={`px-3 py-2 text-right font-mono text-xs ${tone}`}>
                          {formatSignedUSD(t.pnl_usd)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatDuration(t.duration_seconds)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatDate(t.closed_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <p>
                  Page {safePage + 1} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage(safePage + 1)}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <TradeDetail trade={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function normalizeTrades(data: unknown): MemberTradesResponse {
  if (Array.isArray(data)) {
    const open: MemberTrade[] = [];
    const closed: MemberTrade[] = [];
    for (const t of data as MemberTrade[]) {
      if ((t.status ?? "").toLowerCase() === "open") open.push(t);
      else closed.push(t);
    }
    return { open, closed };
  }
  if (data && typeof data === "object") {
    const d = data as { open?: MemberTrade[]; closed?: MemberTrade[] };
    return {
      open: Array.isArray(d.open) ? d.open : [],
      closed: Array.isArray(d.closed) ? d.closed : [],
    };
  }
  return { open: [], closed: [] };
}

function StatCard({
  label,
  value,
  tone = "default",
  small,
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "red";
  small?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald"
      : tone === "red"
        ? "text-red-300"
        : "text-foreground";
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={[
          "mt-2 font-mono font-semibold tracking-tight",
          small ? "text-base" : "text-xl",
          toneClass,
        ].join(" ")}
      >
        {value}
      </p>
    </article>
  );
}

function OpenTradeCard({
  trade,
  onClick,
}: {
  trade: MemberTrade;
  onClick: () => void;
}) {
  const pnl = trade.pnl_usd ?? 0;
  const tone = pnl >= 0 ? "text-emerald" : "text-red-300";
  const SideIcon = (trade.side ?? "").toLowerCase() === "long" ? IconTrendingUp : IconTrendingDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-emerald/40"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-foreground">
          <SideIcon size={14} stroke={1.75} aria-hidden />
          {trade.symbol ?? "—"}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {trade.side ?? "—"}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-base font-semibold ${tone}`}>
          {formatSignedUSD(trade.pnl_usd)}
        </span>
        <span className={`font-mono text-xs ${tone}`}>
          {formatPct(trade.pnl_pct ?? trade.roi_pct)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Mini label="Entry" value={trade.entry ?? "—"} />
        <Mini label="Mark" value={trade.mark_price ?? "—"} />
        <Mini label="SL · TP" value={`${trade.sl_price ?? "—"} · ${trade.tp_price ?? "—"}`} />
      </div>
    </button>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

function TradeDetail({
  trade,
  onClose,
}: {
  trade: MemberTrade | null;
  onClose: () => void;
}) {
  if (!trade) return null;
  const pnl = trade.pnl_usd ?? 0;
  const tone = pnl >= 0 ? "text-emerald" : "text-red-300";
  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <IconChartCandle size={16} stroke={1.75} aria-hidden />
          {trade.symbol ?? "Trade"}
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {trade.side ?? "—"}
          </span>
          {(trade.status ?? "").toLowerCase() === "open" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald">
              <IconCrown size={9} stroke={2} aria-hidden />
              Open
            </span>
          )}
        </span>
      }
      size="md"
    >
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Entry" value={trade.entry ?? "—"} />
        <Field label="Exit" value={trade.exit ?? "—"} />
        <Field label="SL" value={trade.sl_price ?? "—"} />
        <Field label="TP" value={trade.tp_price ?? "—"} />
        <Field
          label="PnL"
          value={
            <span className={`font-mono ${tone}`}>
              {formatSignedUSD(trade.pnl_usd)}
            </span>
          }
        />
        <Field
          label="ROI"
          value={
            <span className={`font-mono ${tone}`}>
              {formatPct(trade.roi_pct ?? trade.pnl_pct)}
            </span>
          }
        />
        <Field label="Opened" value={formatDate(trade.opened_at)} />
        <Field label="Closed" value={formatDate(trade.closed_at)} />
        <Field
          label="Duration"
          value={formatDuration(trade.duration_seconds)}
        />
      </dl>
    </Modal>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm text-foreground">{value}</p>
    </div>
  );
}
