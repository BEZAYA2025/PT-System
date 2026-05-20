"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconDownload,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import {
  csvEscape,
  downloadFile,
  formatDateTime,
} from "@/lib/admin-format";

interface AuditEntry {
  id?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  action_type?: string | null;
  description?: string | null;
  actor?: string | null;
  actor_id?: string | null;
  target_member_id?: string | null;
  target_member_email?: string | null;
  details?: Record<string, unknown> | null;
}

interface AuditResponse {
  items?: AuditEntry[];
  entries?: AuditEntry[];
  page?: number | null;
  pages?: number | null;
  total?: number | null;
}

const PAGE_SIZE = 50;

export function AuditLogView() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionType, setActionType] = useState("");
  const [actor, setActor] = useState("");
  const [targetMember, setTargetMember] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (actionType.trim()) qs.set("action_type", actionType.trim());
      if (actor.trim()) qs.set("actor", actor.trim());
      if (targetMember.trim()) qs.set("target_member", targetMember.trim());
      if (startDate) qs.set("start_date", startDate);
      if (endDate) qs.set("end_date", endDate);
      const res = await fetch(`/api/proxy/admin/audit-log?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      let list: AuditEntry[] = [];
      if (Array.isArray(data)) list = data as AuditEntry[];
      else if (data && typeof data === "object") {
        const d = data as AuditResponse;
        list = d.items ?? d.entries ?? [];
        if (typeof d.pages === "number") setPages(d.pages);
        if (typeof d.total === "number") setTotal(d.total);
      }
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [page, actionType, actor, targetMember, startDate, endDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = () => {
    const headers = [
      "timestamp",
      "action_type",
      "actor",
      "target_member",
      "description",
    ];
    const lines = [headers.join(",")];
    for (const e of items) {
      lines.push(
        [
          csvEscape(e.timestamp ?? e.created_at),
          csvEscape(e.action_type),
          csvEscape(e.actor ?? e.actor_id),
          csvEscape(e.target_member_email ?? e.target_member_id),
          csvEscape(e.description),
        ].join(","),
      );
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`audit-log-${stamp}.csv`, lines.join("\n"));
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every admin action, chronological. Filter and export for
          compliance review.
        </p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Filters
          </h2>
          <button
            type="button"
            onClick={exportCsv}
            disabled={items.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40 disabled:opacity-60"
          >
            <IconDownload size={13} stroke={1.75} aria-hidden />
            Export current page ({items.length})
          </button>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <FilterField label="Action type">
            <div className="relative">
              <IconSearch
                size={12}
                stroke={1.75}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={actionType}
                onChange={(e) => {
                  setActionType(e.target.value);
                  setPage(1);
                }}
                placeholder="suspend, tier_change, …"
                className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
              />
            </div>
          </FilterField>
          <FilterField label="Actor">
            <input
              type="search"
              value={actor}
              onChange={(e) => {
                setActor(e.target.value);
                setPage(1);
              }}
              placeholder="founder id / email"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </FilterField>
          <FilterField label="Target member">
            <input
              type="search"
              value={targetMember}
              onChange={(e) => {
                setTargetMember(e.target.value);
                setPage(1);
              }}
              placeholder="email or member id"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </FilterField>
          <FilterField label="From">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-emerald focus:outline-none"
            />
          </FilterField>
          <FilterField label="To">
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-emerald focus:outline-none"
            />
          </FilterField>
        </div>
      </section>

      {loading && items.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading audit log…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No admin actions match these filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Actor</th>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e, idx) => (
                <tr
                  key={e.id ?? idx}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(e.timestamp ?? e.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {e.action_type ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {e.actor ?? e.actor_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {e.target_member_id ? (
                      <Link
                        href={`/admin/members/${e.target_member_id}`}
                        className="text-foreground hover:text-emerald"
                      >
                        {e.target_member_email ?? e.target_member_id}
                      </Link>
                    ) : (
                      <span className="text-foreground">
                        {e.target_member_email ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {e.description ?? "—"}
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

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}
