"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconCoin,
  IconLoader2,
  IconTrendingUp,
} from "@tabler/icons-react";

interface DailyEntry {
  date?: string | null;
  tokens_in?: number | null;
  tokens_out?: number | null;
  cost_usd?: number | null;
  model?: string | null;
}

interface MemberCostEntry {
  member_id?: string | null;
  member_email?: string | null;
  total_cost_usd?: number | null;
  total_tokens?: number | null;
  last_used_at?: string | null;
}

interface TokenUsageResponse {
  daily_burn?: DailyEntry[];
  by_member_top10?: MemberCostEntry[];
  by_model?: Record<string, { tokens?: number; cost?: number }>;
  current_month_forecast_usd?: number;
  current_month_spend_usd?: number;
}

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString();
}

function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const MODEL_TONE: Record<string, string> = {
  opus: "bg-emerald",
  sonnet: "bg-sky-400",
  haiku: "bg-amber-300",
};

export function AvenTokenUsageTab() {
  const [data, setData] = useState<TokenUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/proxy/admin/aven/token-usage?days=${days}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        setData((d ?? {}) as TokenUsageResponse);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const daily = data?.daily_burn ?? [];
  // Aggregate by date (the response can be one row per model per day;
  // we collapse to a single bar showing total cost with stacked model
  // tint when the dataset offers per-model rows).
  const byDay = useMemo(() => {
    const map = new Map<string, { date: string; total: number; perModel: Record<string, number> }>();
    for (const r of daily) {
      const d = r.date ?? "";
      if (!d) continue;
      const cost = r.cost_usd ?? 0;
      const model = (r.model ?? "other").toLowerCase();
      const existing = map.get(d) ?? { date: d, total: 0, perModel: {} };
      existing.total += cost;
      existing.perModel[model] = (existing.perModel[model] ?? 0) + cost;
      map.set(d, existing);
    }
    return Array.from(map.values()).sort((a, b) => {
      return (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0);
    });
  }, [daily]);

  const maxDay = useMemo(
    () => Math.max(0.001, ...byDay.map((d) => d.total)),
    [byDay],
  );

  const totalSpend = useMemo(
    () => byDay.reduce((a, d) => a + d.total, 0),
    [byDay],
  );

  const byModel = useMemo(() => {
    const obj = data?.by_model ?? {};
    const rows = Object.entries(obj).map(([model, v]) => ({
      model,
      cost: v?.cost ?? 0,
      tokens: v?.tokens ?? 0,
    }));
    const total = rows.reduce((a, r) => a + r.cost, 0);
    return { rows, total };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <BigStat
            label="This month · spend"
            value={formatUSD(
              data?.current_month_spend_usd ?? totalSpend,
            )}
            icon={IconCoin}
          />
          <BigStat
            label="This month · forecast"
            value={formatUSD(data?.current_month_forecast_usd)}
            icon={IconTrendingUp}
            tone="amber"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
                days === d
                  ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2
            size={12}
            stroke={2}
            className="animate-spin"
            aria-hidden
          />
          Loading usage…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      ) : (
        <>
          {/* Daily burn chart */}
          <section className="rounded-2xl border border-border bg-surface/40 p-5">
            <header className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Daily burn · last {days} days
              </h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                {formatUSD(totalSpend)} total
              </p>
            </header>
            {byDay.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No spend in this window.
              </p>
            ) : (
              <>
                <div className="mt-4 flex h-32 items-end gap-1">
                  {byDay.map((d) => {
                    const pct = (d.total / maxDay) * 100;
                    return (
                      <div
                        key={d.date}
                        className="group flex flex-1 flex-col-reverse"
                        title={`${dayLabel(d.date)} · ${formatUSD(d.total)}`}
                      >
                        <span
                          className="block w-full rounded-t bg-emerald/70 transition-colors group-hover:bg-emerald"
                          style={{ height: `${Math.max(2, pct)}%` }}
                          aria-label={`${dayLabel(d.date)}: ${formatUSD(d.total)}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                  <span>{dayLabel(byDay[0]?.date)}</span>
                  <span>{dayLabel(byDay[byDay.length - 1]?.date)}</span>
                </div>
              </>
            )}
          </section>

          {/* Model breakdown */}
          {byModel.rows.length > 0 && byModel.total > 0 && (
            <section className="rounded-2xl border border-border bg-surface/40 p-5">
              <header>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Model breakdown
                </h2>
              </header>
              <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-background">
                {byModel.rows.map((r) => {
                  const pct = (r.cost / byModel.total) * 100;
                  const tone = MODEL_TONE[r.model.toLowerCase()] ?? "bg-muted-foreground/50";
                  return (
                    <div
                      key={r.model}
                      className={`h-full ${tone}`}
                      style={{ width: `${pct}%` }}
                      aria-label={`${r.model}: ${formatUSD(r.cost)}`}
                    />
                  );
                })}
              </div>
              <ul className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                {byModel.rows.map((r) => {
                  const tone = MODEL_TONE[r.model.toLowerCase()] ?? "bg-muted-foreground/50";
                  return (
                    <li
                      key={r.model}
                      className="flex items-center gap-2"
                    >
                      <span
                        aria-hidden
                        className={`size-2 rounded-full ${tone}`}
                      />
                      <span className="text-muted-foreground uppercase tracking-wider">
                        {r.model}
                      </span>
                      <span className="ml-auto font-mono text-foreground">
                        {formatUSD(r.cost)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Top 10 members */}
          <section className="rounded-2xl border border-border bg-surface/40 p-5">
            <header>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                Top 10 members by cost
              </h2>
            </header>
            {(data?.by_member_top10 ?? []).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No member usage recorded.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/60 bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Member</th>
                      <th className="px-3 py-2 font-medium text-right">Cost</th>
                      <th className="px-3 py-2 font-medium text-right">Tokens</th>
                      <th className="px-3 py-2 font-medium">Last used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.by_member_top10 ?? []).map((m, idx) => (
                      <tr
                        key={m.member_id ?? idx}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-3 py-2 text-sm text-foreground">
                          {m.member_id ? (
                            <Link
                              href={`/admin/members/${m.member_id}`}
                              className="hover:text-emerald"
                            >
                              {m.member_email ?? m.member_id}
                            </Link>
                          ) : (
                            m.member_email ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                          {formatUSD(m.total_cost_usd)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                          {formatNumber(m.total_tokens)}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {m.last_used_at ? dayLabel(m.last_used_at) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function BigStat({
  label,
  value,
  icon: Icon,
  tone = "emerald",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "amber" ? "text-amber-300" : "text-emerald";
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-5">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={toneClass}>
          <Icon size={14} stroke={1.75} />
        </span>
      </header>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
    </article>
  );
}
