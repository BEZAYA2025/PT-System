"use client";

import { useEffect, useMemo, useState } from "react";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { formatNumber, formatPct } from "@/lib/admin-format";

interface ServiceMetric {
  service?: string | null;
  msg_volume?: number | null;
  request_count?: number | null;
  success_rate?: number | null;
  error_rate?: number | null;
  p50_ms?: number | null;
  p95_ms?: number | null;
  p99_ms?: number | null;
}

interface PerfPayload {
  services?: ServiceMetric[] | null;
  // Time-series buckets if backend ships them.
  series?: Array<{
    date?: string | null;
    error_rate?: number | null;
    latency_ms?: number | null;
  }> | null;
}

export function SystemPerformanceTab() {
  const [data, setData] = useState<PerfPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/system/performance-metrics", {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        setData((d ?? {}) as PerfPayload);
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

  const services = data?.services ?? [];
  const series = data?.series ?? [];
  const maxLatency = useMemo(
    () => Math.max(1, ...series.map((s) => s.latency_ms ?? 0)),
    [series],
  );

  return (
    <div className="space-y-6">
      {loading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading performance…
        </p>
      )}
      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      {services.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Per-service metrics
            </h2>
          </header>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Service</th>
                  <th className="px-3 py-2 font-medium text-right">Volume</th>
                  <th className="px-3 py-2 font-medium text-right">Success</th>
                  <th className="px-3 py-2 font-medium text-right">p50</th>
                  <th className="px-3 py-2 font-medium text-right">p95</th>
                  <th className="px-3 py-2 font-medium text-right">p99</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s, idx) => (
                  <tr
                    key={s.service ?? idx}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {s.service ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {formatNumber(s.msg_volume ?? s.request_count)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                      {formatPct(s.success_rate)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {s.p50_ms ? `${s.p50_ms}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {s.p95_ms ? `${s.p95_ms}ms` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {s.p99_ms ? `${s.p99_ms}ms` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {series.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Latency over time
            </h2>
          </header>
          <div className="mt-3 flex h-32 items-end gap-1">
            {series.map((s, idx) => {
              const pct = ((s.latency_ms ?? 0) / maxLatency) * 100;
              return (
                <div
                  key={`${s.date ?? idx}`}
                  className="flex flex-1 flex-col-reverse"
                  title={`${s.date ?? "—"} · ${s.latency_ms ?? 0}ms`}
                >
                  <span
                    className="block w-full rounded-t bg-emerald/70"
                    style={{ height: `${Math.max(2, pct)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!loading && !error && services.length === 0 && series.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No performance data reported.
        </p>
      )}
    </div>
  );
}
