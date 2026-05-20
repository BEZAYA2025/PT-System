"use client";

import { useCallback, useEffect, useState } from "react";
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
  MemberTradesPage,
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

function formatDuration(
  duration: number | string | null | undefined,
  fallbackSeconds: number | null | undefined,
): string {
  // §13.14 carries `duration` (likely seconds, sometimes a pre-
  // formatted string). Old payloads kept `duration_seconds`. Accept
  // either; coerce numeric to a compact display.
  let seconds: number | null = null;
  if (typeof duration === "number") seconds = duration;
  else if (typeof duration === "string") {
    const n = Number(duration);
    if (Number.isFinite(n)) seconds = n;
    else return duration;
  } else if (typeof fallbackSeconds === "number") {
    seconds = fallbackSeconds;
  }
  if (seconds === null || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d`;
  const hrs = Math.floor(seconds / 3600);
  if (hrs > 0) return `${hrs}h`;
  const min = Math.floor(seconds / 60);
  return `${min}m`;
}

function slOf(t: MemberTrade): number | string {
  return t.sl ?? t.sl_price ?? "—";
}

function tpOf(t: MemberTrade): number | string {
  return t.tp ?? t.tp_price ?? "—";
}

const PAGE_SIZE = 25;

export function MemberTradesTab({ member }: Props) {
  const [stats, setStats] = useState<MemberTradeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [open, setOpen] = useState<MemberTrade[]>([]);
  const [openLoading, setOpenLoading] = useState(true);

  const [closed, setClosed] = useState<MemberTrade[]>([]);
  const [closedPage, setClosedPage] = useState(1);
  const [closedPages, setClosedPages] = useState(1);
  const [closedTotal, setClosedTotal] = useState<number | null>(null);
  const [closedLoading, setClosedLoading] = useState(true);
  const [tradesError, setTradesError] = useState<string | null>(null);

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

  // Open trades: pull a single bigger page since open positions
  // rarely exceed a handful.
  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/trades?status=open&limit=50`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        setOpen(extractItems(data));
      })
      .catch((err: Error) => {
        if (!cancelled) setTradesError(err.message);
      })
      .finally(() => {
        if (!cancelled) setOpenLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  // Closed trades: server-side paginated.
  const loadClosedPage = useCallback(
    async (p: number) => {
      setClosedLoading(true);
      try {
        const res = await fetch(
          `/api/proxy/admin/members/${encodeURIComponent(member.id)}/trades?status=closed&limit=${PAGE_SIZE}&page=${p}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json().catch(() => null);
        const page = extractPage(data);
        setClosed(page.items);
        setClosedPages(page.pages ?? 1);
        setClosedTotal(page.total ?? null);
        setTradesError(null);
      } catch (err) {
        setTradesError(err instanceof Error ? err.message : "Network error");
      } finally {
        setClosedLoading(false);
      }
    },
    [member.id],
  );

  useEffect(() => {
    void loadClosedPage(1);
  }, [loadClosedPage]);

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
            value={statsLoading ? "—" : formatRMultiple(stats?.avg_r_multiple)}
          />
          <StatCard
            label="Total PnL"
            value={statsLoading ? "—" : formatSignedUSD(stats?.total_pnl_usd)}
            tone={(stats?.total_pnl_usd ?? 0) >= 0 ? "emerald" : "red"}
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
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Open trades
          </h2>
          {!openLoading && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {open.length} open
            </p>
          )}
        </header>
        {openLoading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading…
          </p>
        ) : open.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No open positions right now.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {open.map((t) => (
              <OpenTradeCard
                key={t.id}
                trade={t}
                onClick={() => setDetail(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Closed trades */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Closed trades
          </h2>
          {!closedLoading && closedTotal !== null && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {closedTotal.toLocaleString()} total · page {closedPage} of {closedPages}
            </p>
          )}
        </header>

        {closedLoading && closed.length === 0 ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading…
          </p>
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
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                    <th className="px-3 py-2 font-medium">Exit reason</th>
                    <th className="px-3 py-2 font-medium">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {closed.map((t) => {
                    const pnl = t.pnl_usd ?? 0;
                    const roi = t.margin_roi_pct ?? t.roi_pct ?? t.pnl_pct ?? null;
                    const tone = pnl >= 0 ? "text-emerald" : "text-red-300";
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setDetail(t)}
                        className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-surface/60"
                      >
                        <td className="px-3 py-2 font-mono text-foreground">
                          {t.symbol ?? "—"}
                          {t.leverage ? (
                            <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                              {t.leverage}×
                            </span>
                          ) : null}
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
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                          {t.score ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatDuration(t.duration, t.duration_seconds)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {t.exit_reason ?? "—"}
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
            {closedPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <p>
                  Page {closedPage} of {closedPages}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={closedPage === 1 || closedLoading}
                    onClick={() => {
                      const next = closedPage - 1;
                      setClosedPage(next);
                      void loadClosedPage(next);
                    }}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={closedPage >= closedPages || closedLoading}
                    onClick={() => {
                      const next = closedPage + 1;
                      setClosedPage(next);
                      void loadClosedPage(next);
                    }}
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

function extractItems(data: unknown): MemberTrade[] {
  if (Array.isArray(data)) return data as MemberTrade[];
  if (data && typeof data === "object") {
    const items = (data as { items?: unknown }).items;
    if (Array.isArray(items)) return items as MemberTrade[];
    const open = (data as { open?: unknown }).open;
    if (Array.isArray(open)) return open as MemberTrade[];
  }
  return [];
}

function extractPage(data: unknown): MemberTradesPage {
  if (Array.isArray(data)) {
    return { items: data as MemberTrade[], page: 1, pages: 1, total: data.length };
  }
  if (data && typeof data === "object") {
    const d = data as {
      items?: MemberTrade[];
      page?: number;
      pages?: number;
      total?: number;
    };
    return {
      items: Array.isArray(d.items) ? d.items : [],
      page: d.page ?? 1,
      pages: d.pages ?? 1,
      total: d.total ?? null,
    };
  }
  return { items: [], page: 1, pages: 1, total: 0 };
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
  const SideIcon =
    (trade.side ?? "").toLowerCase() === "long"
      ? IconTrendingUp
      : IconTrendingDown;
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
          {trade.leverage ? (
            <span className="font-mono text-[10px] text-muted-foreground">
              {trade.leverage}×
            </span>
          ) : null}
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
          {formatPct(trade.margin_roi_pct ?? trade.roi_pct ?? trade.pnl_pct)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <Mini label="Entry" value={trade.entry ?? "—"} />
        <Mini label="Mark" value={trade.mark_price ?? "—"} />
        <Mini
          label="SL · TP"
          value={`${slOf(trade)} · ${tpOf(trade)}`}
        />
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
            {trade.leverage ? ` · ${trade.leverage}×` : ""}
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
        <Field label="SL" value={slOf(trade)} />
        <Field label="TP" value={tpOf(trade)} />
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
              {formatPct(trade.margin_roi_pct ?? trade.roi_pct ?? trade.pnl_pct)}
            </span>
          }
        />
        <Field label="Score" value={trade.score ?? "—"} />
        <Field label="Exit reason" value={trade.exit_reason ?? "—"} />
        <Field label="Opened" value={formatDate(trade.opened_at)} />
        <Field label="Closed" value={formatDate(trade.closed_at)} />
        <Field
          label="Duration"
          value={formatDuration(trade.duration, trade.duration_seconds)}
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
