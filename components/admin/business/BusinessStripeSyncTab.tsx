"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconCircleCheck,
  IconLoader2,
} from "@tabler/icons-react";
import { formatDateTime } from "@/lib/admin-format";

interface DriftEntry {
  id?: string | null;
  member_id?: string | null;
  member_email?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  issue?: string | null;
  detected_at?: string | null;
}

interface StripeSyncStatus {
  last_sync_at?: string | null;
  drift?: DriftEntry[] | null;
  orphans?: DriftEntry[] | null;
  ok?: boolean | null;
}

export function BusinessStripeSyncTab() {
  const [data, setData] = useState<StripeSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/proxy/admin/business/stripe-sync-status",
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d: unknown = await res.json().catch(() => null);
      setData((d ?? {}) as StripeSyncStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const drift = data?.drift ?? [];
  const orphans = data?.orphans ?? [];
  const totalIssues = drift.length + orphans.length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Stripe sync status
          </h2>
          {data?.last_sync_at && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last sync · {formatDateTime(data.last_sync_at)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald/40 bg-emerald/[0.08] px-3 text-xs font-semibold text-emerald hover:bg-emerald/[0.14] disabled:opacity-60"
        >
          {loading && (
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
          )}
          Re-check
        </button>
      </header>

      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      {!loading && !error && totalIssues === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald/30 bg-emerald/[0.05] px-6 py-12 text-center">
          <IconCircleCheck
            size={28}
            stroke={1.5}
            className="text-emerald"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            Stripe and the local DB are in sync.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No drift or orphan records detected.
          </p>
        </div>
      ) : null}

      {drift.length > 0 && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5">
          <header>
            <h3 className="text-sm font-semibold text-amber-200">
              Drift · {drift.length}
            </h3>
            <p className="mt-0.5 text-xs text-amber-200/80">
              Local records whose fields disagree with Stripe.
            </p>
          </header>
          <ul className="mt-3 space-y-2">
            {drift.map((d, idx) => (
              <IssueRow key={d.id ?? idx} entry={d} />
            ))}
          </ul>
        </section>
      )}

      {orphans.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h3 className="text-sm font-semibold text-foreground">
              Orphans · {orphans.length}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Records that exist on one side but not the other.
            </p>
          </header>
          <ul className="mt-3 space-y-2">
            {orphans.map((d, idx) => (
              <IssueRow key={d.id ?? idx} entry={d} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function IssueRow({ entry }: { entry: DriftEntry }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
      <div className="min-w-0">
        {entry.member_id ? (
          <Link
            href={`/admin/members/${entry.member_id}`}
            className="text-sm text-foreground hover:text-emerald"
          >
            {entry.member_email ?? entry.member_id}
          </Link>
        ) : (
          <span className="text-sm text-foreground">
            {entry.member_email ?? entry.stripe_customer_id ?? "—"}
          </span>
        )}
        {entry.issue && (
          <p className="mt-0.5 text-[11px] text-amber-200">{entry.issue}</p>
        )}
      </div>
      {entry.stripe_customer_id && (
        <span className="font-mono text-[10px] text-muted-foreground">
          {entry.stripe_customer_id}
        </span>
      )}
    </li>
  );
}
