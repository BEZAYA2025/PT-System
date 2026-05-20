"use client";

import { useCallback, useEffect, useState } from "react";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { formatDateTime } from "@/lib/admin-format";

interface WebhookLog {
  id: string;
  source?: "stripe" | "resend" | string | null;
  event_type?: string | null;
  status?: string | null;
  response_code?: number | null;
  created_at?: string | null;
}

interface WebhookLogsResponse {
  items?: WebhookLog[];
  logs?: WebhookLog[];
  page?: number | null;
  pages?: number | null;
  total?: number | null;
}

type SourceFilter = "all" | "stripe" | "resend";

const PAGE_SIZE = 50;

function statusClass(s: string | null | undefined): string {
  const v = (s ?? "").toLowerCase();
  if (v === "ok" || v === "success" || v === "delivered")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (v === "failed" || v === "error")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  if (v === "retrying" || v === "pending")
    return "border-amber-500/30 bg-amber-500/[0.08] text-amber-200";
  return "border-border bg-surface text-muted-foreground";
}

export function SystemWebhooksTab() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [source, setSource] = useState<SourceFilter>("all");
  const [days, setDays] = useState(7);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
        days: String(days),
      });
      if (source !== "all") qs.set("source", source);
      const res = await fetch(
        `/api/proxy/admin/system/webhook-logs?${qs}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      let items: WebhookLog[] = [];
      if (Array.isArray(data)) items = data as WebhookLog[];
      else if (data && typeof data === "object") {
        const d = data as WebhookLogsResponse;
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
  }, [source, days, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "All sources" },
              { key: "stripe", label: "Stripe" },
              { key: "resend", label: "Resend" },
            ] as Array<{ key: SourceFilter; label: string }>
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSource(key);
                setPage(1);
              }}
              aria-pressed={source === key}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
                source === key
                  ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
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
          Loading webhooks…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : logs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No webhook deliveries in this window.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium text-right">HTTP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(l.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs uppercase text-muted-foreground">
                    {l.source ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">
                    {l.event_type ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusClass(l.status)}`}
                    >
                      {l.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                    {l.response_code ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
