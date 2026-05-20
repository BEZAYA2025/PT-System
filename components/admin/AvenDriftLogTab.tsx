"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconLoader2,
  IconShieldCheck,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";

interface DriftEntry {
  id: string;
  severity?: "critical" | "warn" | "info" | string | null;
  pattern_matched?: string | null;
  original_text?: string | null;
  replaced_text?: string | null;
  conversation_id?: string | null;
  member_id?: string | null;
  member_email?: string | null;
  created_at?: string | null;
}

type SeverityFilter = "all" | "critical" | "warn" | "info";

const SEVERITY_FILTERS: Array<{ key: SeverityFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "warn", label: "Warn" },
  { key: "info", label: "Info" },
];

function severityTone(s: string | null | undefined): {
  pill: string;
  Icon: React.ComponentType<{ size?: number; stroke?: number }>;
} {
  const v = (s ?? "").toLowerCase();
  if (v === "critical")
    return {
      pill: "border-red-400/40 bg-red-500/[0.08] text-red-300",
      Icon: IconAlertCircle,
    };
  if (v === "warn")
    return {
      pill: "border-amber-500/40 bg-amber-500/[0.08] text-amber-200",
      Icon: IconAlertTriangle,
    };
  return {
    pill: "border-sky-400/40 bg-sky-400/[0.08] text-sky-300",
    Icon: IconInfoCircle,
  };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(s: string | null | undefined, max = 80): string {
  if (!s) return "—";
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

export function AvenDriftLogTab() {
  const [entries, setEntries] = useState<DriftEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [pattern, setPattern] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [detail, setDetail] = useState<DriftEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (severity !== "all") qs.set("severity", severity);
      if (pattern.trim()) qs.set("pattern", pattern.trim());
      if (startDate) qs.set("start_date", startDate);
      if (endDate) qs.set("end_date", endDate);
      const res = await fetch(`/api/proxy/admin/aven/drift-log?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as DriftEntry[])
        : data && typeof data === "object"
          ? ((data as { entries?: DriftEntry[] }).entries ?? [])
          : [];
      setEntries(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [severity, pattern, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = useMemo(() => {
    const list = entries ?? [];
    const today = new Date().toISOString().slice(0, 10);
    let todayCount = 0;
    let critical = 0;
    let warn = 0;
    for (const e of list) {
      const dateStr = (e.created_at ?? "").slice(0, 10);
      if (dateStr === today) todayCount++;
      const s = (e.severity ?? "").toLowerCase();
      if (s === "critical") critical++;
      if (s === "warn") warn++;
    }
    return { today: todayCount, critical, warn };
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Flags today"
          value={counts.today.toLocaleString()}
        />
        <StatCard
          label="Critical"
          value={counts.critical.toLocaleString()}
          tone="red"
        />
        <StatCard
          label="Warn"
          value={counts.warn.toLocaleString()}
          tone="amber"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {SEVERITY_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSeverity(key)}
              aria-pressed={severity === key}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
                severity === key
                  ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Pattern…"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-emerald focus:outline-none"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-emerald focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2
            size={12}
            stroke={2}
            className="animate-spin"
            aria-hidden
          />
          Loading drift log…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      ) : !entries || entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <IconShieldCheck
            size={28}
            stroke={1.5}
            className="text-emerald"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            No drift detected
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing matched the active filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Pattern</th>
                <th className="px-3 py-2 font-medium">Original</th>
                <th className="px-3 py-2 font-medium">Replaced</th>
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const tone = severityTone(e.severity);
                return (
                  <tr
                    key={e.id}
                    onClick={() => setDetail(e)}
                    className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-surface/60"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
                      >
                        <tone.Icon size={10} stroke={2} aria-hidden />
                        {e.severity ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {e.pattern_matched ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {truncate(e.original_text, 60)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {truncate(e.replaced_text, 60)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {e.member_id ? (
                        <Link
                          href={`/admin/members/${e.member_id}?tab=aven`}
                          className="text-foreground hover:text-emerald"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          {e.member_email ?? e.member_id}
                        </Link>
                      ) : (
                        e.member_email ?? "—"
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {formatDate(e.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <DriftDetailModal entry={detail} onClose={() => setDetail(null)} />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber" | "red";
}) {
  const toneClass =
    tone === "red"
      ? "text-red-300"
      : tone === "amber"
        ? "text-amber-300"
        : "text-foreground";
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${toneClass}`}
      >
        {value}
      </p>
    </article>
  );
}

function DriftDetailModal({
  entry,
  onClose,
}: {
  entry: DriftEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  const tone = severityTone(entry.severity);
  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <tone.Icon size={14} stroke={2} aria-hidden />
          Drift · {entry.pattern_matched ?? "pattern"}
        </span>
      }
      description={formatDate(entry.created_at)}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
          >
            <tone.Icon size={10} stroke={2} aria-hidden />
            {entry.severity ?? "—"}
          </span>
          {entry.member_id && (
            <Link
              href={`/admin/members/${entry.member_id}?tab=aven`}
              className="font-mono text-[11px] text-emerald hover:text-emerald-hover"
            >
              {entry.member_email ?? entry.member_id}
            </Link>
          )}
          {entry.conversation_id && (
            <span className="font-mono text-[11px] text-muted-foreground">
              conv {entry.conversation_id.slice(0, 8)}…
            </span>
          )}
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Original
          </p>
          <pre className="whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/[0.05] px-3 py-2 font-mono text-xs text-red-200">
            {entry.original_text ?? "—"}
          </pre>
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Replaced
          </p>
          <pre className="whitespace-pre-wrap rounded-lg border border-emerald/30 bg-emerald/[0.05] px-3 py-2 font-mono text-xs text-emerald">
            {entry.replaced_text ?? "—"}
          </pre>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
