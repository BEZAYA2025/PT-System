"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconBan,
  IconLoader2,
  IconRoute,
} from "@tabler/icons-react";
import { formatDateTime, formatNumber, formatPct } from "@/lib/admin-format";

interface SystemSnapshot {
  system_prompt?: string | null;
  persona?: {
    tone?: string | null;
    language?: string | null;
    verbosity?: string | null;
  } | null;
  methodik_boundaries?: string[] | null;
  anti_drift?: string[] | null;
  stats?: {
    curriculum_total?: number | null;
    curriculum_covered?: number | null;
    curriculum_pending?: number | null;
    vkb_total?: number | null;
    voice_notes_total?: number | null;
    voice_notes_recent?: number | null;
    last_training_update_at?: string | null;
  } | null;
}

export function TrainAvenSystemTab() {
  const [data, setData] = useState<SystemSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/aven/system-snapshot", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setError("not_deployed");
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled || d === null) return;
        setData((d ?? {}) as SystemSnapshot);
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

  if (loading) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
        Loading Aven snapshot…
      </p>
    );
  }
  if (error === "not_deployed") {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
        /api/admin/aven/system-snapshot endpoint not yet deployed.
        Auto-fills the moment it lands.
      </p>
    );
  }
  if (error) {
    return (
      <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
        <IconAlertCircle size={12} stroke={1.75} aria-hidden />
        {error}
      </p>
    );
  }

  const stats = data?.stats ?? {};
  const covered = stats.curriculum_covered ?? 0;
  const total = stats.curriculum_total ?? 0;
  const coveredPct = total > 0 ? (covered / total) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Curriculum"
          value={`${formatNumber(covered)} / ${formatNumber(total)}`}
          hint={coveredPct !== null ? `${formatPct(coveredPct)} covered` : undefined}
        />
        <StatCard
          label="Pending topics"
          value={formatNumber(stats.curriculum_pending)}
        />
        <StatCard
          label="VKB entries"
          value={formatNumber(stats.vkb_total)}
        />
        <StatCard
          label="Voice notes"
          value={formatNumber(stats.voice_notes_total)}
          hint={
            stats.voice_notes_recent !== null &&
            stats.voice_notes_recent !== undefined
              ? `+${formatNumber(stats.voice_notes_recent)} recent`
              : undefined
          }
        />
      </div>

      {stats.last_training_update_at && (
        <p className="text-xs text-muted-foreground">
          Last training data update · {formatDateTime(stats.last_training_update_at)}
        </p>
      )}

      {data?.system_prompt && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              System prompt
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Read-only.</p>
          </header>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-3 py-2 font-mono text-[11px] text-foreground">
            {data.system_prompt}
          </pre>
        </section>
      )}

      {data?.persona && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Persona config
            </h2>
          </header>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Row label="Tone" value={data.persona.tone ?? "—"} />
            <Row label="Language" value={data.persona.language ?? "—"} />
            <Row label="Verbosity" value={data.persona.verbosity ?? "—"} />
          </dl>
        </section>
      )}

      {data?.methodik_boundaries && data.methodik_boundaries.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header className="flex items-center gap-2">
            <IconRoute
              size={14}
              stroke={1.75}
              className="text-emerald"
              aria-hidden
            />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Methodik boundaries
            </h2>
          </header>
          <ul className="mt-3 space-y-1 text-xs text-foreground">
            {data.methodik_boundaries.map((b, idx) => (
              <li
                key={idx}
                className="rounded-md border border-border/60 bg-background px-3 py-1.5 font-mono"
              >
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data?.anti_drift && data.anti_drift.length > 0 && (
        <section className="rounded-2xl border border-red-400/30 bg-red-500/[0.04] p-5">
          <header className="flex items-center gap-2">
            <IconBan
              size={14}
              stroke={1.75}
              className="text-red-300"
              aria-hidden
            />
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              Anti-drift hard no-list
            </h2>
          </header>
          <ul className="mt-3 space-y-1 text-xs text-foreground">
            {data.anti_drift.map((b, idx) => (
              <li
                key={idx}
                className="rounded-md border border-red-400/20 bg-background px-3 py-1.5 font-mono"
              >
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}
