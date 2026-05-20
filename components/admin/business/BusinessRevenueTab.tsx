"use client";

import { useEffect, useState } from "react";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { formatNumber, formatUSD } from "@/lib/admin-format";

interface MrrByTier {
  tier?: string | null;
  mrr?: number | null;
  amount?: number | null;
  count?: number | null;
}

interface MrrPayload {
  current?: number | null;
  by_tier?: MrrByTier[] | null;
  by_interval?: { monthly?: number; yearly?: number } | null;
  // Time series — if backend exposes it, we render the bar chart.
  series?: Array<{ date?: string; mrr?: number }> | null;
}

function dayLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function BusinessRevenueTab() {
  const [data, setData] = useState<MrrPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/metrics/mrr", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        setData((d ?? {}) as MrrPayload);
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
  }, []);

  const series = data?.series ?? [];
  const maxSeries = Math.max(1, ...series.map((d) => d.mrr ?? 0));

  return (
    <div className="space-y-6">
      {loading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading revenue…
        </p>
      )}
      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Current MRR
          </h2>
          <p className="font-mono text-2xl font-semibold text-foreground">
            {formatUSD(data?.current)}
          </p>
        </header>
      </section>

      {series.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              MRR trend
            </h2>
            <p className="font-mono text-[11px] text-muted-foreground">
              {series.length} buckets
            </p>
          </header>
          <div className="mt-4 flex h-32 items-end gap-1">
            {series.map((d, idx) => {
              const pct = ((d.mrr ?? 0) / maxSeries) * 100;
              return (
                <div
                  key={`${d.date ?? idx}`}
                  className="flex flex-1 flex-col-reverse"
                  title={`${dayLabel(d.date)} · ${formatUSD(d.mrr)}`}
                >
                  <span
                    className="block w-full rounded-t bg-emerald/70"
                    style={{ height: `${Math.max(2, pct)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>{dayLabel(series[0]?.date)}</span>
            <span>{dayLabel(series[series.length - 1]?.date)}</span>
          </div>
        </section>
      )}

      {data?.by_tier && data.by_tier.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Per tier
            </h2>
          </header>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Tier</th>
                <th className="px-2 py-2 font-medium text-right">Members</th>
                <th className="px-2 py-2 font-medium text-right">MRR</th>
              </tr>
            </thead>
            <tbody>
              {data.by_tier.map((row, idx) => (
                <tr key={idx} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-2 text-foreground">
                    {(row.tier ?? "—").toString().toUpperCase()}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-muted-foreground">
                    {formatNumber(row.count)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-foreground">
                    {formatUSD(row.mrr ?? row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
