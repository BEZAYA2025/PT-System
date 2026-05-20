"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAlertCircle,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import { Toast, type ToastState } from "@/components/Toast";
import {
  formatDateTime,
  formatNumber,
  formatPct,
} from "@/lib/admin-format";
import type { PendingBriefing } from "@/lib/admin";
import { BriefingApprovalView } from "./BriefingApprovalView";

type TabKey = "pending" | "history" | "edit" | "stats";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "history", label: "History" },
  { key: "edit", label: "Edit" },
  { key: "stats", label: "Stats" },
];

function isTabKey(v: string | null): v is TabKey {
  return v === "pending" || v === "history" || v === "edit" || v === "stats";
}

interface Props {
  initialPending: PendingBriefing[] | null;
}

export function BriefingsSectionView({ initialPending }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "pending";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "pending") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/briefings${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Briefings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review pending briefings, browse history, edit content, and
          inspect open-rate stats.
        </p>
      </header>

      <nav
        aria-label="Briefings tabs"
        className="overflow-x-auto sm:overflow-visible"
      >
        <ul className="flex min-w-max gap-1 sm:min-w-0">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex h-11 items-center px-3 text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-emerald"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section>
        {activeTab === "pending" && (
          <BriefingApprovalView initialPending={initialPending} />
        )}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "edit" && <EditTab />}
        {activeTab === "stats" && <StatsTab />}
      </section>
    </div>
  );
}

// ----- History ------------------------------------------------------

interface BriefingHistoryEntry {
  id: string;
  date?: string | null;
  generated_at?: string | null;
  created_at?: string | null;
  approved_at?: string | null;
  kind?: string | null;
  asset?: string | null;
  symbol?: string | null;
  status?: "approved" | "rejected" | "pending" | string | null;
  body?: string | null;
}

function statusClass(s: string | null | undefined): string {
  const v = (s ?? "").toLowerCase();
  if (v === "approved")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (v === "rejected")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  if (v === "pending")
    return "border-amber-500/30 bg-amber-500/[0.08] text-amber-200";
  return "border-border bg-surface text-muted-foreground";
}

function HistoryTab() {
  const [items, setItems] = useState<BriefingHistoryEntry[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "50" });
      if (query.trim()) qs.set("q", query.trim());
      const res = await fetch(`/api/proxy/admin/briefings?${qs}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      let list: BriefingHistoryEntry[] = [];
      if (Array.isArray(data)) list = data as BriefingHistoryEntry[];
      else if (data && typeof data === "object") {
        const d = data as {
          briefings?: BriefingHistoryEntry[];
          items?: BriefingHistoryEntry[];
          pages?: number;
        };
        list = d.briefings ?? d.items ?? [];
        if (typeof d.pages === "number") setPages(d.pages);
      }
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <IconSearch
          size={14}
          stroke={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search briefings"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
        />
      </div>

      {loading && items.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No briefings match this search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Asset</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Approved</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(b.generated_at ?? b.created_at ?? b.date)}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
                    {b.kind ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-foreground">
                    {b.asset ?? b.symbol ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusClass(b.status)}`}
                    >
                      {b.status ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(b.approved_at)}
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
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
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

// ----- Edit ---------------------------------------------------------

function EditTab() {
  const [items, setItems] = useState<BriefingHistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [originalBody, setOriginalBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [bodyLoading, setBodyLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/briefings?limit=50", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        let list: BriefingHistoryEntry[] = [];
        if (Array.isArray(data)) list = data as BriefingHistoryEntry[];
        else if (data && typeof data === "object") {
          list =
            (data as { briefings?: BriefingHistoryEntry[] }).briefings ??
            (data as { items?: BriefingHistoryEntry[] }).items ??
            [];
        }
        setItems(list);
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

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setBodyLoading(true);
    fetch(`/api/proxy/admin/briefings/${encodeURIComponent(selectedId)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const inner =
          data && typeof data === "object"
            ? ((data as { briefing?: BriefingHistoryEntry }).briefing ??
                (data as BriefingHistoryEntry))
            : null;
        const text = inner?.body ?? "";
        setBody(text);
        setOriginalBody(text);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setBodyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const dirty = body !== originalBody;

  const save = async () => {
    if (!selectedId || !dirty || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/briefings/${encodeURIComponent(selectedId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOriginalBody(body);
      setToast({ message: "Briefing saved", tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Save failed · ${err.message}` : "Save failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_minmax(0,1fr)]">
      <aside className="space-y-2">
        <header>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Recent briefings
          </h2>
        </header>
        {loading ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
            Loading…
          </p>
        ) : error ? (
          <p className="text-xs text-amber-200">{error}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  aria-current={selectedId === b.id ? "true" : undefined}
                  className={[
                    "w-full rounded-lg border px-3 py-2 text-left text-xs",
                    selectedId === b.id
                      ? "border-emerald/40 bg-emerald/[0.06]"
                      : "border-border bg-surface/40 hover:border-foreground/20",
                  ].join(" ")}
                >
                  <p className="font-mono text-foreground">
                    {b.asset ?? b.symbol ?? "—"} · {b.kind ?? "—"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(b.generated_at ?? b.created_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="rounded-xl border border-border bg-surface/40 p-4">
        {!selectedId ? (
          <p className="text-sm text-muted-foreground">
            Pick a briefing from the left to edit.
          </p>
        ) : bodyLoading ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
            Loading briefing…
          </p>
        ) : (
          <div className="space-y-3">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={20}
              disabled={busy}
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-emerald focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBody(originalBody)}
                disabled={busy || !dirty}
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy || !dirty}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
              >
                {busy && (
                  <IconLoader2
                    size={14}
                    stroke={2}
                    className="animate-spin"
                    aria-hidden
                  />
                )}
                Save
              </button>
            </div>
          </div>
        )}
      </section>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ----- Stats --------------------------------------------------------

interface BriefingStats {
  briefing_id?: string | null;
  open_rate?: number | null;
  open_count?: number | null;
  total_recipients?: number | null;
  click_through_rate?: number | null;
  member_feedback?: Array<{ score?: number; note?: string }> | null;
}

function StatsTab() {
  const [items, setItems] = useState<BriefingHistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<BriefingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/briefings?limit=50&status=approved", {
      cache: "no-store",
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as BriefingHistoryEntry[])
          : data && typeof data === "object"
            ? ((data as { briefings?: BriefingHistoryEntry[] }).briefings ??
                (data as { items?: BriefingHistoryEntry[] }).items ??
                [])
            : [];
        setItems(list);
        if (!selectedId && list.length > 0) setSelectedId(list[0].id);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setStatsLoading(true);
    setStatsError(null);
    setStats(null);
    fetch(
      `/api/proxy/admin/briefings/${encodeURIComponent(selectedId)}/stats`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setStatsError("not_deployed");
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled || d === null) return;
        setStats((d ?? {}) as BriefingStats);
      })
      .catch((err: Error) => {
        if (!cancelled) setStatsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_minmax(0,1fr)]">
      <aside className="space-y-2">
        <header>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Approved briefings
          </h2>
        </header>
        {loading ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
            Loading…
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No approved briefings yet.</p>
        ) : (
          <ul className="space-y-1">
            {items.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  aria-current={selectedId === b.id ? "true" : undefined}
                  className={[
                    "w-full rounded-lg border px-3 py-2 text-left text-xs",
                    selectedId === b.id
                      ? "border-emerald/40 bg-emerald/[0.06]"
                      : "border-border bg-surface/40 hover:border-foreground/20",
                  ].join(" ")}
                >
                  <p className="font-mono text-foreground">
                    {b.asset ?? b.symbol ?? "—"} · {b.kind ?? "—"}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {formatDateTime(b.approved_at ?? b.generated_at)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="space-y-4">
        {statsLoading && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
            Loading stats…
          </p>
        )}
        {statsError === "not_deployed" && (
          <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
            Per-briefing stats endpoint not yet deployed.
          </p>
        )}
        {statsError && statsError !== "not_deployed" && (
          <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            {statsError}
          </p>
        )}
        {stats && !statsLoading && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Open rate"
                value={formatPct(stats.open_rate)}
              />
              <StatCard
                label="Opens"
                value={formatNumber(stats.open_count)}
              />
              <StatCard
                label="Recipients"
                value={formatNumber(stats.total_recipients)}
              />
            </div>
            {typeof stats.click_through_rate === "number" && (
              <p className="text-xs text-muted-foreground">
                Click-through rate: {formatPct(stats.click_through_rate)}
              </p>
            )}
            {stats.member_feedback && stats.member_feedback.length > 0 && (
              <section className="rounded-xl border border-border bg-surface/40 p-4">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Member feedback
                </h3>
                <ul className="mt-3 space-y-2">
                  {stats.member_feedback.map((f, idx) => (
                    <li key={idx} className="rounded-md border border-border/60 bg-background px-3 py-2 text-xs">
                      <span className="font-mono text-emerald">
                        {f.score ?? "—"}
                      </span>
                      {f.note && (
                        <p className="mt-1 text-foreground">{f.note}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </article>
  );
}
