"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconCoin,
  IconLoader2,
  IconTrendingUp,
  IconUserMinus,
  IconUsers,
} from "@tabler/icons-react";
import { formatNumber, formatPct, formatUSD } from "@/lib/admin-format";

interface MrrPayload {
  current?: number | null;
  previous?: number | null;
  delta_pct?: number | null;
}

interface ChurnPayload {
  rate_pct?: number | null;
  cancelled_count?: number | null;
  active_count?: number | null;
}

interface SignupsPayload {
  total?: number | null;
  new_7d?: number | null;
  new_30d?: number | null;
  active?: number | null;
}

export function BusinessOverviewTab() {
  const [mrr, setMrr] = useState<MrrPayload | null>(null);
  const [churn, setChurn] = useState<ChurnPayload | null>(null);
  const [signups, setSignups] = useState<SignupsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/proxy/admin/metrics/mrr", { cache: "no-store" }).then((r) =>
        r.ok ? r.json() : null,
      ),
      fetch("/api/proxy/admin/metrics/churn", { cache: "no-store" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
      fetch("/api/proxy/admin/metrics/signups", { cache: "no-store" }).then(
        (r) => (r.ok ? r.json() : null),
      ),
    ])
      .then(([m, c, s]) => {
        if (cancelled) return;
        setMrr(m as MrrPayload | null);
        setChurn(c as ChurnPayload | null);
        setSignups(s as SignupsPayload | null);
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

  const mrrCur = mrr?.current ?? 0;
  const arr = mrrCur * 12;
  const activeCount = signups?.active ?? signups?.total ?? 0;

  return (
    <div className="space-y-6">
      {loading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading business metrics…
        </p>
      )}
      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={IconCoin}
          label="MRR"
          value={formatUSD(mrrCur)}
          hint={
            mrr?.delta_pct !== null && mrr?.delta_pct !== undefined
              ? `${mrr.delta_pct >= 0 ? "+" : ""}${mrr.delta_pct.toFixed(1)}% vs last month`
              : undefined
          }
        />
        <KpiCard
          icon={IconTrendingUp}
          label="ARR"
          value={formatUSD(arr)}
          hint="MRR × 12"
        />
        <KpiCard
          icon={IconUserMinus}
          label="Churn rate"
          value={formatPct(churn?.rate_pct)}
          hint={
            churn?.cancelled_count !== null && churn?.cancelled_count !== undefined
              ? `${formatNumber(churn.cancelled_count)} cancelled`
              : undefined
          }
        />
        <KpiCard
          icon={IconUsers}
          label="Active members"
          value={formatNumber(activeCount)}
          hint={
            signups?.new_7d !== null && signups?.new_7d !== undefined
              ? `+${formatNumber(signups.new_7d)} last 7d`
              : undefined
          }
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Historical trend sparklines land once the backend exposes a
        time-series endpoint. Today the KPI cards reflect the
        current snapshot only.
      </p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-5">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">
          <Icon size={14} stroke={1.75} />
        </span>
      </header>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}
