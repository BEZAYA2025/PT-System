"use client";

import { useEffect, useState } from "react";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { formatDate, formatPct } from "@/lib/admin-format";

interface CohortRow {
  cohort_week?: string | null;
  cohort_date?: string | null;
  signups?: number | null;
  size?: number | null;
  w1?: number | null;
  w4?: number | null;
  w12?: number | null;
  // Backend may also return a generic {week: pct} map.
  retention?: Record<string, number> | null;
}

interface CohortPayload {
  cohorts?: CohortRow[];
  weeks?: number | null;
}

function readWeek(
  row: CohortRow,
  field: "w1" | "w4" | "w12",
): number | null {
  if (typeof row[field] === "number") return row[field] as number;
  if (row.retention && typeof row.retention[field] === "number") {
    return row.retention[field];
  }
  if (row.retention && typeof row.retention[field.slice(1)] === "number") {
    return row.retention[field.slice(1)];
  }
  return null;
}

function cellTone(pct: number | null): string {
  if (pct === null) return "bg-surface text-muted-foreground";
  const v = pct <= 1 ? pct * 100 : pct;
  if (v >= 70) return "bg-emerald/40 text-foreground";
  if (v >= 40) return "bg-emerald/[0.18] text-emerald";
  if (v >= 15) return "bg-amber-500/[0.18] text-amber-200";
  return "bg-red-500/[0.12] text-red-300";
}

export function BusinessCohortsTab() {
  const [data, setData] = useState<CohortPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(12);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/proxy/admin/business/cohort-analysis?weeks=${weeks}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(d)
          ? { cohorts: d as CohortRow[] }
          : ((d ?? {}) as CohortPayload);
        setData(list);
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
  }, [weeks]);

  const cohorts = data?.cohorts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {[8, 12, 26].map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWeeks(w)}
            aria-pressed={weeks === w}
            className={[
              "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
              weeks === w
                ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {w}w
          </button>
        ))}
      </div>

      {loading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading cohorts…
        </p>
      )}
      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      {!loading && !error && cohorts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Not enough cohort data yet — need at least a few weeks of
          signups before w1/w4/w12 retention is computable.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Cohort</th>
                <th className="px-3 py-2 font-medium text-right">Size</th>
                <th className="px-3 py-2 font-medium text-center">w1</th>
                <th className="px-3 py-2 font-medium text-center">w4</th>
                <th className="px-3 py-2 font-medium text-center">w12</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((row, idx) => {
                const w1 = readWeek(row, "w1");
                const w4 = readWeek(row, "w4");
                const w12 = readWeek(row, "w12");
                return (
                  <tr key={idx} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {formatDate(row.cohort_week ?? row.cohort_date)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                      {row.size ?? row.signups ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex w-12 justify-center rounded px-2 py-0.5 font-mono text-[11px] ${cellTone(w1)}`}
                      >
                        {w1 === null ? "—" : formatPct(w1)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex w-12 justify-center rounded px-2 py-0.5 font-mono text-[11px] ${cellTone(w4)}`}
                      >
                        {w4 === null ? "—" : formatPct(w4)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex w-12 justify-center rounded px-2 py-0.5 font-mono text-[11px] ${cellTone(w12)}`}
                      >
                        {w12 === null ? "—" : formatPct(w12)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
