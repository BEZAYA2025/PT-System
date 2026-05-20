"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconInfoCircle,
  IconLoader2,
  IconShieldCheck,
} from "@tabler/icons-react";

interface TopPattern {
  pattern?: string | null;
  count?: number | null;
  last_seen?: string | null;
  severity?: "info" | "warn" | "critical" | string | null;
}

interface DailyEntry {
  date?: string | null;
  total?: number | null;
  critical?: number | null;
  warn?: number | null;
  info?: number | null;
}

interface LatestCritical {
  id?: string | null;
  timestamp?: string | null;
  pattern?: string | null;
  original_snippet?: string | null;
  conversation_id?: string | null;
  member_id?: string | null;
  member_email?: string | null;
}

interface QualityAuditReport {
  date_range?: { start?: string | null; end?: string | null; days?: number | null };
  total_audits?: number | null;
  by_source?: { regex?: number | null; llm?: number | null };
  by_severity?: {
    info?: number | null;
    warn?: number | null;
    critical?: number | null;
  };
  top_patterns?: TopPattern[];
  latest_critical?: LatestCritical[];
  daily_breakdown?: DailyEntry[];
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityClass(s: string | null | undefined): string {
  const v = (s ?? "").toLowerCase();
  if (v === "critical")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  if (v === "warn")
    return "border-amber-500/40 bg-amber-500/[0.08] text-amber-200";
  return "border-sky-400/40 bg-sky-400/[0.08] text-sky-300";
}

function truncate(s: string | null | undefined, max = 110): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

export function AvenQualityAuditTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<QualityAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(
      `/api/proxy/admin/aven/quality-audit-reports?days=${days}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        setData((d ?? {}) as QualityAuditReport);
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

  const total = data?.total_audits ?? 0;
  const sevCritical = data?.by_severity?.critical ?? 0;
  const sevWarn = data?.by_severity?.warn ?? 0;
  const sevInfo = data?.by_severity?.info ?? 0;
  const srcRegex = data?.by_source?.regex ?? 0;
  const srcLlm = data?.by_source?.llm ?? 0;
  const srcTotal = Math.max(1, srcRegex + srcLlm);
  const topPatterns = data?.top_patterns ?? [];
  const topPattern = topPatterns[0] ?? null;
  const dailyBreakdown = data?.daily_breakdown ?? [];
  const latestCritical = data?.latest_critical ?? [];

  const maxDay = useMemo(
    () =>
      Math.max(
        1,
        ...dailyBreakdown.map((d) => d.total ?? 0),
      ),
    [dailyBreakdown],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        {loading && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading…
          </p>
        )}
      </div>

      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      )}

      {!loading && !error && data && total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <IconShieldCheck
            size={28}
            stroke={1.5}
            className="text-emerald"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            No quality audits yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing flagged in the selected window.
          </p>
        </div>
      ) : !loading && !error ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total audits" value={total.toLocaleString()} />
            <StatCard
              label="Critical"
              value={sevCritical.toLocaleString()}
              tone="red"
            />
            <StatCard
              label="Warn"
              value={sevWarn.toLocaleString()}
              tone="amber"
            />
            <StatCard
              label="Top pattern"
              value={topPattern?.pattern ?? "—"}
              hint={
                topPattern?.count
                  ? `${topPattern.count} hits`
                  : undefined
              }
              small
            />
          </div>

          {/* Source breakdown — regex vs LLM share bar */}
          {(srcRegex > 0 || srcLlm > 0) && (
            <section className="rounded-2xl border border-border bg-surface/40 p-5">
              <header className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Detection source
                </h2>
                <p className="font-mono text-[11px] text-muted-foreground">
                  regex {srcRegex} · LLM {srcLlm}
                </p>
              </header>
              <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className="h-full bg-emerald"
                  style={{ width: `${(srcRegex / srcTotal) * 100}%` }}
                  aria-label={`regex ${srcRegex}`}
                />
                <div
                  className="h-full bg-sky-400"
                  style={{ width: `${(srcLlm / srcTotal) * 100}%` }}
                  aria-label={`LLM ${srcLlm}`}
                />
              </div>
              <ul className="mt-3 flex flex-wrap gap-4 text-xs">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-emerald" />
                  <span className="text-muted-foreground">regex</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-sky-400" />
                  <span className="text-muted-foreground">LLM</span>
                </li>
              </ul>
            </section>
          )}

          {/* Daily breakdown — stacked bars (critical / warn / info) */}
          {dailyBreakdown.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface/40 p-5">
              <header className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Daily trend · last {days} days
                </h2>
              </header>
              <div className="mt-4 flex h-32 items-end gap-1">
                {dailyBreakdown.map((d) => {
                  const critPct = ((d.critical ?? 0) / maxDay) * 100;
                  const warnPct = ((d.warn ?? 0) / maxDay) * 100;
                  const infoPct = ((d.info ?? 0) / maxDay) * 100;
                  const totalPct = critPct + warnPct + infoPct;
                  return (
                    <div
                      key={d.date ?? Math.random()}
                      className="flex flex-1 flex-col-reverse"
                      title={`${formatDate(d.date)} · ${d.total ?? 0} (${d.critical ?? 0} critical / ${d.warn ?? 0} warn / ${d.info ?? 0} info)`}
                    >
                      <span
                        className="block w-full bg-sky-400"
                        style={{ height: `${Math.max(0, infoPct)}%` }}
                      />
                      <span
                        className="block w-full bg-amber-400"
                        style={{ height: `${Math.max(0, warnPct)}%` }}
                      />
                      <span
                        className="block w-full rounded-t bg-red-400"
                        style={{ height: `${Math.max(2, totalPct === 0 ? 2 : critPct)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>{formatDate(dailyBreakdown[0]?.date)}</span>
                <span>
                  {formatDate(dailyBreakdown[dailyBreakdown.length - 1]?.date)}
                </span>
              </div>
              <ul className="mt-3 flex flex-wrap gap-4 text-xs">
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-red-400" />
                  <span className="text-muted-foreground">critical</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-amber-400" />
                  <span className="text-muted-foreground">warn</span>
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-sky-400" />
                  <span className="text-muted-foreground">info</span>
                </li>
              </ul>
              {sevInfo > 0 && (
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                  Total info-level: {sevInfo.toLocaleString()}
                </p>
              )}
            </section>
          )}

          {/* Top patterns table — click filters drift-log */}
          {topPatterns.length > 0 && (
            <section className="rounded-2xl border border-border bg-surface/40 p-5">
              <header>
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Top patterns
                </h2>
              </header>
              <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border/60 bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Pattern</th>
                      <th className="px-3 py-2 font-medium">Severity</th>
                      <th className="px-3 py-2 font-medium text-right">
                        Count
                      </th>
                      <th className="px-3 py-2 font-medium">Last seen</th>
                      <th className="px-3 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {topPatterns.map((p, idx) => (
                      <tr
                        key={`${p.pattern ?? idx}`}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="px-3 py-2 font-mono text-xs text-foreground">
                          {p.pattern ?? "—"}
                        </td>
                        <td className="px-3 py-2">
                          {p.severity && (
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${severityClass(p.severity)}`}
                            >
                              {p.severity}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                          {(p.count ?? 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {formatDateTime(p.last_seen)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {p.pattern && (
                            <Link
                              href={`/admin/aven?tab=drift&pattern=${encodeURIComponent(p.pattern)}`}
                              className="text-[11px] text-emerald hover:text-emerald-hover"
                            >
                              View hits →
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Latest critical issues */}
          {latestCritical.length > 0 && (
            <section className="rounded-2xl border border-red-400/30 bg-red-500/[0.04] p-5">
              <header className="flex items-baseline gap-2">
                <IconAlertCircle
                  size={14}
                  stroke={2}
                  className="text-red-300"
                  aria-hidden
                />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Latest critical
                </h2>
              </header>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {latestCritical.slice(0, 6).map((c, idx) => (
                  <article
                    key={c.id ?? idx}
                    className="rounded-lg border border-border bg-background p-3"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-red-300">
                      {c.pattern ?? "pattern"} ·{" "}
                      {formatDateTime(c.timestamp)}
                    </p>
                    {c.original_snippet && (
                      <p className="mt-1 text-xs text-foreground">
                        {truncate(c.original_snippet, 140)}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      {c.member_id ? (
                        <Link
                          href={`/admin/members/${c.member_id}?tab=aven`}
                          className="text-emerald hover:text-emerald-hover"
                        >
                          {c.member_email ?? c.member_id}
                        </Link>
                      ) : (
                        <span>{c.member_email ?? "—"}</span>
                      )}
                      {c.conversation_id && (
                        <span className="font-mono">
                          conv {c.conversation_id.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
  small,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "amber" | "red";
  small?: boolean;
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
        className={[
          "mt-2 font-mono font-semibold tracking-tight",
          small ? "text-sm" : "text-2xl",
          toneClass,
        ].join(" ")}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          {hint}
        </p>
      )}
    </article>
  );
}
