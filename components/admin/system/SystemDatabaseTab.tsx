"use client";

import { useEffect, useState } from "react";
import { IconAlertCircle, IconDatabase, IconLoader2 } from "@tabler/icons-react";
import { formatNumber } from "@/lib/admin-format";

interface TableStat {
  name?: string | null;
  row_count?: number | null;
  size_bytes?: number | null;
  index_count?: number | null;
}

interface SlowQuery {
  query?: string | null;
  mean_ms?: number | null;
  calls?: number | null;
}

interface DbStats {
  database_size_bytes?: number | null;
  tables?: TableStat[] | null;
  slow_queries?: SlowQuery[] | null;
}

function formatBytes(b: number | null | undefined): string {
  if (b === null || b === undefined) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function SystemDatabaseTab() {
  const [data, setData] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/system/db-stats", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        setData((d ?? {}) as DbStats);
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

  const tables = data?.tables ?? [];
  const slowQueries = data?.slow_queries ?? [];

  return (
    <div className="space-y-6">
      {loading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading DB stats…
        </p>
      )}
      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      {data && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header className="flex items-center gap-2">
            <IconDatabase
              size={14}
              stroke={1.75}
              className="text-emerald"
              aria-hidden
            />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Database
            </h2>
          </header>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
            {formatBytes(data.database_size_bytes)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Total on-disk size</p>
        </section>
      )}

      {tables.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Tables
            </h2>
          </header>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium text-right">Rows</th>
                  <th className="px-3 py-2 font-medium text-right">Size</th>
                  <th className="px-3 py-2 font-medium text-right">Indexes</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t, idx) => (
                  <tr key={t.name ?? idx} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {t.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {formatNumber(t.row_count)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                      {formatBytes(t.size_bytes)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {formatNumber(t.index_count)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {slowQueries.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Slow queries
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ranked by mean execution time.
            </p>
          </header>
          <ul className="mt-3 space-y-2">
            {slowQueries.slice(0, 10).map((q, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-amber-300">
                    {q.mean_ms ? `${q.mean_ms.toFixed(0)}ms` : "—"}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {formatNumber(q.calls)} calls
                  </span>
                </div>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-foreground/80">
                  {q.query ?? "—"}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
