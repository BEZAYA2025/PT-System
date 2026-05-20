"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconChevronRight,
  IconLoader2,
} from "@tabler/icons-react";
import { formatDateTime } from "@/lib/admin-format";

interface ErrorLog {
  id: string;
  level?: "error" | "warn" | string | null;
  service?: string | null;
  message?: string | null;
  stack?: string | null;
  created_at?: string | null;
}

interface ErrorLogsResponse {
  items?: ErrorLog[];
  logs?: ErrorLog[];
  page?: number | null;
  pages?: number | null;
  total?: number | null;
}

type LevelFilter = "all" | "error" | "warn";

function levelTone(s: string | null | undefined): string {
  const v = (s ?? "").toLowerCase();
  if (v === "error")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  if (v === "warn")
    return "border-amber-500/30 bg-amber-500/[0.08] text-amber-200";
  return "border-border bg-surface text-muted-foreground";
}

export function SystemErrorsTab() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [level, setLevel] = useState<LevelFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("");
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        page: String(page),
        days: String(days),
        limit: "50",
      });
      if (level !== "all") qs.set("level", level);
      if (serviceFilter.trim()) qs.set("service", serviceFilter.trim());
      const res = await fetch(
        `/api/proxy/admin/system/error-logs?${qs}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      let items: ErrorLog[] = [];
      if (Array.isArray(data)) items = data as ErrorLog[];
      else if (data && typeof data === "object") {
        const d = data as ErrorLogsResponse;
        items = d.items ?? d.logs ?? [];
        if (typeof d.pages === "number") setPages(d.pages);
        if (typeof d.total === "number") setTotal(d.total);
      }
      setLogs(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [level, serviceFilter, days, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "All levels" },
              { key: "error", label: "Errors" },
              { key: "warn", label: "Warnings" },
            ] as Array<{ key: LevelFilter; label: string }>
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setLevel(key);
                setPage(1);
              }}
              aria-pressed={level === key}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
                level === key
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
          value={serviceFilter}
          onChange={(e) => {
            setServiceFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Service filter…"
          className="rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {[1, 7, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDays(d);
                setPage(1);
              }}
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

      {loading && logs.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading errors…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald/30 bg-emerald/[0.05] px-6 py-12 text-center">
          <IconAlertTriangle
            size={28}
            stroke={1.5}
            className="text-emerald"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            No errors in this window
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li
              key={l.id}
              className="rounded-xl border border-border bg-surface/40"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedId(expandedId === l.id ? null : l.id)
                }
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left"
              >
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${levelTone(l.level)}`}
                >
                  {l.level ?? "—"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    {l.message ?? "(no message)"}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {l.service ?? "—"} · {formatDateTime(l.created_at)}
                  </p>
                </div>
                {l.stack && (
                  <IconChevronRight
                    size={14}
                    stroke={1.75}
                    aria-hidden
                    className={[
                      "shrink-0 text-muted-foreground transition-transform",
                      expandedId === l.id ? "rotate-90" : "",
                    ].join(" ")}
                  />
                )}
              </button>
              {expandedId === l.id && l.stack && (
                <pre className="border-t border-border/60 bg-background px-3 py-2 font-mono text-[11px] text-muted-foreground overflow-x-auto whitespace-pre">
                  {l.stack}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Page {page} of {pages}
            {total !== null && ` · ${total.toLocaleString()} total`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages || loading}
              onClick={() => setPage(page + 1)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
