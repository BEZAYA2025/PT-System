"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import { formatDateTime, formatUSDCents } from "@/lib/admin-format";

interface RefundRow {
  id: string;
  date?: string | null;
  created?: string | null;
  amount_usd?: number | null;
  amount?: number | null;
  reason?: string | null;
  status?: string | null;
  member_id?: string | null;
  member_email?: string | null;
}

interface RefundsResponse {
  items?: RefundRow[];
  refunds?: RefundRow[];
  page?: number | null;
  pages?: number | null;
  total?: number | null;
}

const PAGE_SIZE = 25;

function statusClass(s: string | null | undefined): string {
  const v = (s ?? "").toLowerCase();
  if (v === "succeeded" || v === "paid")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (v === "pending" || v === "processing")
    return "border-amber-500/30 bg-amber-500/[0.08] text-amber-200";
  if (v === "failed" || v === "canceled")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  return "border-border bg-surface text-muted-foreground";
}

export function BusinessRefundsTab() {
  const [rows, setRows] = useState<RefundRow[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proxy/admin/business/refund-history?limit=${PAGE_SIZE}&page=${p}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      let items: RefundRow[] = [];
      if (Array.isArray(data)) items = data as RefundRow[];
      else if (data && typeof data === "object") {
        const d = data as RefundsResponse;
        items = d.items ?? d.refunds ?? [];
        if (typeof d.pages === "number") setPages(d.pages);
        if (typeof d.total === "number") setTotal(d.total);
      }
      setRows(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  return (
    <div className="space-y-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Refund history
        </h2>
        {total !== null && (
          <p className="font-mono text-[11px] text-muted-foreground">
            {total.toLocaleString()} total · page {page} of {pages}
          </p>
        )}
      </header>

      {loading && rows.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading refunds…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No refunds on record.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium text-right">Amount</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(r.date ?? r.created)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.member_id ? (
                      <Link
                        href={`/admin/members/${r.member_id}`}
                        className="text-foreground hover:text-emerald"
                      >
                        {r.member_email ?? r.member_id}
                      </Link>
                    ) : (
                      <span className="text-foreground">
                        {r.member_email ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                    {formatUSDCents(r.amount_usd ?? r.amount)}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {r.reason ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusClass(r.status)}`}
                    >
                      {r.status ?? "—"}
                    </span>
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
