"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconChevronRight,
  IconDownload,
  IconLoader2,
  IconMail,
  IconSearch,
  IconSend,
  IconTag,
  IconX,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type { AdminMembersListEntry } from "@/lib/admin";
import { ActionsMenu } from "./ActionsMenu";

interface Props {
  initialMembers: AdminMembersListEntry[] | null;
}

type StatusFilter =
  | "all"
  | "active"
  | "trial"
  | "cancelled"
  | "suspended"
  | "inactive";
type RiskFilter = "all" | "healthy" | "at-risk" | "power-user";
type ValueFilter = "all" | "high" | "medium" | "low";
type TierFilter = "all" | "standard" | "vip";
type ConnectionFilter =
  | "all"
  | "exchange-yes"
  | "exchange-no"
  | "telegram-yes"
  | "telegram-no";

type SortKey = "joined" | "lastActive" | "engagement" | "ltv" | "status";
type SortDir = "asc" | "desc";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "cancelled", label: "Cancelled" },
  { key: "suspended", label: "Suspended" },
  { key: "inactive", label: "Inactive (>14d)" },
];

const RISK_FILTERS: Array<{ key: RiskFilter; label: string }> = [
  { key: "all", label: "Any risk" },
  { key: "healthy", label: "Healthy" },
  { key: "at-risk", label: "At-Risk" },
  { key: "power-user", label: "Power-User" },
];

const VALUE_FILTERS: Array<{ key: ValueFilter; label: string }> = [
  { key: "all", label: "Any value" },
  { key: "high", label: "High (>$500)" },
  { key: "medium", label: "Medium ($100–500)" },
  { key: "low", label: "Low (<$100)" },
];

const TIER_FILTERS: Array<{ key: TierFilter; label: string }> = [
  { key: "all", label: "Any tier" },
  { key: "standard", label: "Standard" },
  { key: "vip", label: "VIP" },
];

const CONNECTION_FILTERS: Array<{ key: ConnectionFilter; label: string }> = [
  { key: "all", label: "Any connection" },
  { key: "exchange-yes", label: "Exchange ✓" },
  { key: "exchange-no", label: "Exchange ✗" },
  { key: "telegram-yes", label: "Telegram ✓" },
  { key: "telegram-no", label: "Telegram ✗" },
];

const PAGE_SIZE = 25;
const INACTIVE_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Backend §27 O4: the raw `subscription_status` column is "active" for
// trialing members too (DB stores trial_started_at separately) — using
// it directly is the root cause of "all members show active". Read in
// strict order: effective_status > subscription_status_display >
// is_trial → "trialing" > raw status. Plus is_trial is the unambiguous
// trial boolean which we honour as a second-pass override.
function memberStatusOf(m: AdminMembersListEntry): string | null {
  const eff = m.effective_status ?? m.subscription_status_display ?? null;
  if (eff) return eff;
  if (m.is_trial === true) return "trialing";
  return m.subscription_status ?? m.status ?? null;
}

function statusGroup(
  status: string | null | undefined,
): "active" | "trial" | "cancelled" | "suspended" | "all" {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "past_due") return "active";
  if (s === "trial" || s === "trialing") return "trial";
  if (s === "canceled" || s === "cancelled" || s === "incomplete_expired")
    return "cancelled";
  if (s === "suspended") return "suspended";
  return "all";
}

function statusBadgeClass(status: string | null | undefined): string {
  const g = statusGroup(status);
  if (g === "active") return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (g === "trial") return "border-sky-400/30 bg-sky-400/[0.08] text-sky-300";
  if (g === "cancelled")
    return "border-border bg-surface text-muted-foreground";
  if (g === "suspended")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  return "border-border bg-surface text-muted-foreground";
}

function exchangeConnected(m: AdminMembersListEntry): boolean {
  return Boolean(
    m.exchange_connected ??
      m.has_exchange_connection ??
      m.binance_api_key_connected,
  );
}

// Field-mapping helpers — backend §25 (post-audit) renamed/added a few
// fields. Read both shapes so the table renders on either deploy
// without forcing a backend cut-over.
function ltvUsd(m: AdminMembersListEntry): number | null {
  return m.ltv_usd ?? m.lifetime_value_usd ?? null;
}
function joinedAt(m: AdminMembersListEntry): string | null {
  return m.joined ?? m.joined_at ?? m.created_at ?? null;
}
function activity7d(m: AdminMembersListEntry): number {
  // Prefer the §25 union count. Fall back to summing the per-source
  // fields if backend still ships the old breakdown. brief_views is
  // intentionally summed too even though it's currently always 0 —
  // once the /api/track wire lands it starts contributing.
  if (typeof m.activity_7d === "number") return m.activity_7d;
  return (
    (m.aven_messages_count_7d ?? 0) +
    (m.trades_count_7d ?? 0) +
    (m.brief_views_count_7d ?? 0)
  );
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / MS_PER_DAY;
}

function lastActiveColor(iso: string | null | undefined): {
  dot: string;
  label: string;
} {
  const d = daysSince(iso);
  if (d === null) return { dot: "bg-muted-foreground/40", label: "Never" };
  if (d < 1) {
    if (d < 1 / 24) {
      const mins = Math.max(1, Math.round(d * 24 * 60));
      return { dot: "bg-emerald", label: `${mins} min ago` };
    }
    const hrs = Math.max(1, Math.round(d * 24));
    return { dot: "bg-emerald", label: `${hrs}h ago` };
  }
  if (d < 7) {
    const days = Math.round(d);
    return { dot: "bg-amber-400", label: `${days} day${days === 1 ? "" : "s"} ago` };
  }
  const days = Math.round(d);
  return { dot: "bg-red-400", label: `${days} days ago` };
}

function engagementTone(score: number | null | undefined): {
  bg: string;
  text: string;
} {
  if (score === null || score === undefined)
    return { bg: "bg-surface", text: "text-muted-foreground" };
  if (score < 30)
    return { bg: "bg-red-500/[0.12]", text: "text-red-300" };
  if (score < 70)
    return { bg: "bg-amber-500/[0.12]", text: "text-amber-300" };
  return { bg: "bg-emerald/[0.14]", text: "text-emerald" };
}

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportCSV(rows: AdminMembersListEntry[]) {
  const headers = [
    "id",
    "email",
    "display_name",
    "tier",
    "status",
    "joined",
    "last_active_at",
    "engagement_score",
    "ltv_usd",
    "activity_7d",
    "exchange_connected",
    "telegram_connected",
  ];
  const lines = [headers.join(",")];
  for (const m of rows) {
    lines.push(
      [
        csvEscape(m.id),
        csvEscape(m.email),
        csvEscape(m.display_name),
        csvEscape(m.tier),
        csvEscape(memberStatusOf(m)),
        csvEscape(joinedAt(m)),
        csvEscape(m.last_active_at),
        csvEscape(m.engagement_score),
        csvEscape(ltvUsd(m)),
        csvEscape(activity7d(m)),
        csvEscape(exchangeConnected(m) ? "true" : "false"),
        csvEscape(m.telegram_connected ? "true" : "false"),
      ].join(","),
    );
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `members-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function MembersTable({ initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<AdminMembersListEntry[]>(
    initialMembers ?? [],
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [valueFilter, setValueFilter] = useState<ValueFilter>("all");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [connFilter, setConnFilter] = useState<ConnectionFilter>("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState<
    { kind: "suspend" | "reactivate"; id: string; name: string } | null
  >(null);
  const [bulkTag, setBulkTag] = useState<{
    op: "add" | "remove";
    value: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = members.slice();

    if (statusFilter !== "all") {
      list = list.filter((m) => {
        const g = statusGroup(memberStatusOf(m));
        if (statusFilter === "inactive") {
          const d = daysSince(m.last_active_at);
          return d === null || d > INACTIVE_DAYS;
        }
        return g === statusFilter;
      });
    }

    if (riskFilter !== "all") {
      list = list.filter((m) => {
        const s = m.engagement_score;
        if (s === null || s === undefined) return false;
        if (riskFilter === "at-risk") return s < 30;
        if (riskFilter === "power-user") return s > 70;
        return s >= 30 && s <= 70;
      });
    }

    if (valueFilter !== "all") {
      list = list.filter((m) => {
        const ltv = ltvUsd(m) ?? 0;
        if (valueFilter === "high") return ltv > 500;
        if (valueFilter === "medium") return ltv >= 100 && ltv <= 500;
        return ltv < 100;
      });
    }

    if (tierFilter !== "all") {
      list = list.filter((m) => (m.tier ?? "standard") === tierFilter);
    }

    if (connFilter !== "all") {
      list = list.filter((m) => {
        if (connFilter === "exchange-yes") return exchangeConnected(m);
        if (connFilter === "exchange-no") return !exchangeConnected(m);
        if (connFilter === "telegram-yes") return Boolean(m.telegram_connected);
        return !m.telegram_connected;
      });
    }

    if (q) {
      list = list.filter(
        (m) =>
          m.email.toLowerCase().includes(q) ||
          (m.display_name ?? "").toLowerCase().includes(q) ||
          (m.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    const sorted = list.sort((a, b) => {
      if (sortKey === "joined") {
        const at = Date.parse(joinedAt(a) ?? "") || 0;
        const bt = Date.parse(joinedAt(b) ?? "") || 0;
        return sortDir === "asc" ? at - bt : bt - at;
      }
      if (sortKey === "lastActive") {
        const at = Date.parse(a.last_active_at ?? "") || 0;
        const bt = Date.parse(b.last_active_at ?? "") || 0;
        return sortDir === "asc" ? at - bt : bt - at;
      }
      if (sortKey === "engagement") {
        const ae = a.engagement_score ?? -1;
        const be = b.engagement_score ?? -1;
        return sortDir === "asc" ? ae - be : be - ae;
      }
      if (sortKey === "ltv") {
        const al = ltvUsd(a) ?? -1;
        const bl = ltvUsd(b) ?? -1;
        return sortDir === "asc" ? al - bl : bl - al;
      }
      const ag = statusGroup(a.status);
      const bg = statusGroup(b.status);
      return sortDir === "asc"
        ? ag.localeCompare(bg)
        : bg.localeCompare(ag);
    });
    return sorted;
  }, [
    members,
    query,
    statusFilter,
    riskFilter,
    valueFilter,
    tierFilter,
    connFilter,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((m) => selected.has(m.id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const togglePageSelection = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const m of pageRows) next.delete(m.id);
      } else {
        for (const m of pageRows) next.add(m.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectedRows = useMemo(
    () => members.filter((m) => selected.has(m.id)),
    [members, selected],
  );

  const exportRows = selectedRows.length > 0 ? selectedRows : filtered;

  const handleChangeTier = async (id: string, tier: "standard" | "vip") => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(id)}/tier`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, tier } : m)),
      );
      setToast({
        message: `Tier set to ${tier.toUpperCase()}`,
        tone: "success",
      });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Tier change failed · ${err.message}`
            : "Tier change failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(id)}/suspend`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "suspended" } : m)),
      );
      setToast({ message: "Member suspended", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Suspend failed · ${err.message}`
            : "Suspend failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const handleReactivate = async (id: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(id)}/reactivate`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: "active" } : m)),
      );
      setToast({ message: "Member reactivated", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Reactivate failed · ${err.message}`
            : "Reactivate failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const runBulkTag = async () => {
    if (!bulkTag || busy) return;
    const tag = bulkTag.value.trim();
    if (!tag) return;
    setBusy(true);
    const op = bulkTag.op;
    const method = op === "add" ? "POST" : "DELETE";
    try {
      const results = await Promise.allSettled(
        selectedRows.map((m) =>
          fetch(
            `/api/proxy/admin/members/${encodeURIComponent(m.id)}/tags`,
            {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tag }),
            },
          ),
        ),
      );
      const failed = results.filter(
        (r) =>
          r.status === "rejected" ||
          (r.status === "fulfilled" && !r.value.ok),
      ).length;
      setMembers((prev) =>
        prev.map((m) => {
          if (!selected.has(m.id)) return m;
          const existing = m.tags ?? [];
          if (op === "add" && !existing.includes(tag)) {
            return { ...m, tags: [...existing, tag] };
          }
          if (op === "remove") {
            return { ...m, tags: existing.filter((t) => t !== tag) };
          }
          return m;
        }),
      );
      if (failed === 0) {
        setToast({
          message: `Tag ${op === "add" ? "added to" : "removed from"} ${selectedRows.length} member${selectedRows.length === 1 ? "" : "s"}`,
          tone: "success",
        });
      } else {
        setToast({
          message: `${selectedRows.length - failed} succeeded, ${failed} failed`,
          tone: "error",
        });
      }
      router.refresh();
    } finally {
      setBusy(false);
      setBulkTag(null);
    }
  };

  if (!initialMembers) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-6">
        <p className="flex items-center gap-2 text-sm text-amber-200">
          <IconAlertCircle size={16} stroke={1.75} aria-hidden />
          Couldn&apos;t reach the members service. Try refreshing.
        </p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/40 px-6 py-16 text-center">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          No members yet
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Members will appear here as people subscribe.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
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
                setPage(0);
              }}
              placeholder="Search by email, name, or tag"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} member
            {filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Primary status pills + advanced toggle. Secondary filter
            stacks (risk / value / tier / connection) live in a
            collapsible panel so the page header stays compact when
            you're not actively segmenting. */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterRow
            filters={STATUS_FILTERS}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(0);
            }}
          />
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
            className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {showAdvanced ? "Hide filters ▴" : "More filters ▾"}
          </button>
        </div>

        {/* Active filter chips — render only the non-default values
            so the founder can clear individual filters or wipe them
            all in one click. */}
        {(riskFilter !== "all" ||
          valueFilter !== "all" ||
          tierFilter !== "all" ||
          connFilter !== "all") && (
          <div className="flex flex-wrap items-center gap-1.5">
            {riskFilter !== "all" && (
              <FilterChip
                label={`Risk · ${RISK_FILTERS.find((f) => f.key === riskFilter)?.label}`}
                onClear={() => {
                  setRiskFilter("all");
                  setPage(0);
                }}
              />
            )}
            {valueFilter !== "all" && (
              <FilterChip
                label={`Value · ${VALUE_FILTERS.find((f) => f.key === valueFilter)?.label}`}
                onClear={() => {
                  setValueFilter("all");
                  setPage(0);
                }}
              />
            )}
            {tierFilter !== "all" && (
              <FilterChip
                label={`Tier · ${TIER_FILTERS.find((f) => f.key === tierFilter)?.label}`}
                onClear={() => {
                  setTierFilter("all");
                  setPage(0);
                }}
              />
            )}
            {connFilter !== "all" && (
              <FilterChip
                label={`Conn · ${CONNECTION_FILTERS.find((f) => f.key === connFilter)?.label}`}
                onClear={() => {
                  setConnFilter("all");
                  setPage(0);
                }}
              />
            )}
            {[riskFilter, valueFilter, tierFilter, connFilter].filter(
              (f) => f !== "all",
            ).length >= 2 && (
              <button
                type="button"
                onClick={() => {
                  setRiskFilter("all");
                  setValueFilter("all");
                  setTierFilter("all");
                  setConnFilter("all");
                  setPage(0);
                }}
                className="ml-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {showAdvanced && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface/40 p-3">
            <FilterRow
              filters={RISK_FILTERS}
              value={riskFilter}
              onChange={(v) => {
                setRiskFilter(v);
                setPage(0);
              }}
              tone="amber"
            />
            <FilterRow
              filters={VALUE_FILTERS}
              value={valueFilter}
              onChange={(v) => {
                setValueFilter(v);
                setPage(0);
              }}
              tone="amber"
            />
            <FilterRow
              filters={TIER_FILTERS}
              value={tierFilter}
              onChange={(v) => {
                setTierFilter(v);
                setPage(0);
              }}
              tone="amber"
            />
            <FilterRow
              filters={CONNECTION_FILTERS}
              value={connFilter}
              onChange={(v) => {
                setConnFilter(v);
                setPage(0);
              }}
              tone="amber"
            />
          </div>
        )}

        {/* Bulk-action bar — sticky-ish above table, shown only when
            anything is selected. CSV export honours the selection if
            any rows are checked, otherwise dumps the current filtered
            view so the founder can grab a snapshot of any segment. */}
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald/30 bg-emerald/[0.05] px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald">
                {selected.size} selected
              </span>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportCSV(exportRows)}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
              >
                <IconDownload size={13} stroke={1.75} aria-hidden />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setBulkTag({ op: "add", value: "" })}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
              >
                <IconTag size={13} stroke={1.75} aria-hidden />
                Bulk tag
              </button>
              <button
                type="button"
                disabled
                title="Coming in Sprint 3"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground opacity-60 disabled:cursor-not-allowed"
              >
                <IconMail size={13} stroke={1.75} aria-hidden />
                Send Email
              </button>
              <button
                type="button"
                disabled
                title="Coming in Sprint 3"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground opacity-60 disabled:cursor-not-allowed"
              >
                <IconSend size={13} stroke={1.75} aria-hidden />
                Send Telegram
              </button>
            </div>
          </div>
        )}

        {/* When no rows are selected, still expose Export CSV so the
            founder can grab the current filtered slice without
            checking every box. */}
        {selected.size === 0 && (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => exportCSV(filtered)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
            >
              <IconDownload size={13} stroke={1.75} aria-hidden />
              Export filtered ({filtered.length})
            </button>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface/40 md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-[36px] px-3 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all on this page"
                    checked={allOnPageSelected}
                    onChange={togglePageSelection}
                    className="size-4 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Display Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader
                    label="Status"
                    active={sortKey === "status"}
                    dir={sortDir}
                    onClick={() => toggleSort("status")}
                  />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader
                    label="Last Active"
                    active={sortKey === "lastActive"}
                    dir={sortDir}
                    onClick={() => toggleSort("lastActive")}
                  />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader
                    label="Engagement"
                    active={sortKey === "engagement"}
                    dir={sortDir}
                    onClick={() => toggleSort("engagement")}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Activity 7d</th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader
                    label="LTV"
                    active={sortKey === "ltv"}
                    dir={sortDir}
                    onClick={() => toggleSort("ltv")}
                  />
                </th>
                <th className="px-4 py-3 font-medium">
                  <SortHeader
                    label="Joined"
                    active={sortKey === "joined"}
                    dir={sortDir}
                    onClick={() => toggleSort("joined")}
                  />
                </th>
                <th
                  className="w-[44px] px-2 py-3 font-medium"
                  aria-label="Actions"
                />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  selected={selected.has(m.id)}
                  onToggleSelect={() => toggleOne(m.id)}
                  onTier={(tier) => handleChangeTier(m.id, tier)}
                  onSuspend={() =>
                    setConfirm({
                      kind: "suspend",
                      id: m.id,
                      name: m.display_name ?? m.email,
                    })
                  }
                  onReactivate={() =>
                    setConfirm({
                      kind: "reactivate",
                      id: m.id,
                      name: m.display_name ?? m.email,
                    })
                  }
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <ul className="grid gap-2 md:hidden">
          {pageRows.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              selected={selected.has(m.id)}
              onToggleSelect={() => toggleOne(m.id)}
              onTier={(tier) => handleChangeTier(m.id, tier)}
              onSuspend={() =>
                setConfirm({
                  kind: "suspend",
                  id: m.id,
                  name: m.display_name ?? m.email,
                })
              }
              onReactivate={() =>
                setConfirm({
                  kind: "reactivate",
                  id: m.id,
                  name: m.display_name ?? m.email,
                })
              }
            />
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              Page {safePage + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage(safePage - 1)}
                className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
                className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={confirm?.kind === "suspend"}
        onClose={() => !busy && setConfirm(null)}
        title="Suspend member?"
        description={confirm?.name}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            They&apos;ll lose access immediately. Their subscription stays
            on the Stripe side — you&apos;re only revoking app access.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirm && handleSuspend(confirm.id)}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-sm font-semibold text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
            >
              {busy && (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              )}
              Suspend
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirm?.kind === "reactivate"}
        onClose={() => !busy && setConfirm(null)}
        title="Reactivate member?"
        description={confirm?.name}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>This restores full access immediately.</p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirm(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => confirm && handleReactivate(confirm.id)}
              disabled={busy}
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
              Reactivate
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={bulkTag !== null}
        onClose={() => !busy && setBulkTag(null)}
        title={bulkTag?.op === "remove" ? "Bulk remove tag" : "Bulk add tag"}
        description={`Applies to ${selectedRows.length} selected member${selectedRows.length === 1 ? "" : "s"}`}
        size="sm"
      >
        {bulkTag && (
          <div className="space-y-4 text-sm text-foreground">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setBulkTag({ ...bulkTag, op: "add" })}
                className={[
                  "inline-flex h-8 flex-1 items-center justify-center rounded-md border px-3 text-xs font-medium",
                  bulkTag.op === "add"
                    ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                    : "border-border bg-background text-foreground",
                ].join(" ")}
              >
                Add tag
              </button>
              <button
                type="button"
                onClick={() => setBulkTag({ ...bulkTag, op: "remove" })}
                className={[
                  "inline-flex h-8 flex-1 items-center justify-center rounded-md border px-3 text-xs font-medium",
                  bulkTag.op === "remove"
                    ? "border-red-400/40 bg-red-500/[0.08] text-red-200"
                    : "border-border bg-background text-foreground",
                ].join(" ")}
              >
                Remove tag
              </button>
            </div>
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Tag
              </span>
              <input
                type="text"
                value={bulkTag.value}
                onChange={(e) =>
                  setBulkTag({ ...bulkTag, value: e.target.value })
                }
                placeholder="vip-prospect"
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkTag(null)}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runBulkTag}
                disabled={busy || !bulkTag.value.trim()}
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
                Apply
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

function FilterChip({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
      {label}
      <button
        type="button"
        aria-label={`Clear ${label}`}
        onClick={onClear}
        className="ml-0.5 inline-flex size-3.5 items-center justify-center rounded-full text-emerald/70 hover:bg-emerald/[0.18] hover:text-emerald"
      >
        ×
      </button>
    </span>
  );
}

function FilterRow<T extends string>({
  filters,
  value,
  onChange,
  tone = "emerald",
}: {
  filters: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  tone?: "emerald" | "amber";
}) {
  const activeClass =
    tone === "amber"
      ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-200"
      : "border-emerald/40 bg-emerald/[0.08] text-emerald";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {filters.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={[
            "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
            value === key
              ? activeClass
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 font-medium transition-colors",
        active ? "text-emerald" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
      {active &&
        (dir === "asc" ? (
          <IconArrowUp size={11} stroke={2} aria-hidden />
        ) : (
          <IconArrowDown size={11} stroke={2} aria-hidden />
        ))}
    </button>
  );
}

function MemberRow({
  member,
  selected,
  onToggleSelect,
  onTier,
  onSuspend,
  onReactivate,
}: {
  member: AdminMembersListEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onTier: (tier: "standard" | "vip") => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const last = lastActiveColor(member.last_active_at);
  const eng = engagementTone(member.engagement_score);
  const detailHref = `/admin/members/${member.id}`;
  return (
    <tr
      className={[
        "border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60",
        selected ? "bg-emerald/[0.04]" : "",
      ].join(" ")}
    >
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          aria-label={`Select ${member.display_name ?? member.email}`}
          checked={selected}
          onChange={onToggleSelect}
          className="size-4 cursor-pointer"
        />
      </td>
      <td className="px-4 py-3 text-foreground">
        <Link
          href={detailHref}
          className="font-medium text-foreground hover:text-emerald"
        >
          {member.display_name ?? "—"}
        </Link>
      </td>
      <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
      <td className="px-4 py-3">
        <span
          className={[
            "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
            member.tier === "vip"
              ? "border-emerald/30 bg-emerald/[0.08] text-emerald"
              : "border-border bg-surface text-muted-foreground",
          ].join(" ")}
        >
          {member.tier ?? "standard"}
        </span>
      </td>
      <td className="px-4 py-3">
        {(() => {
          const s = memberStatusOf(member);
          return (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadgeClass(s)}`}
            >
              {s ?? "—"}
            </span>
          );
        })()}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground" suppressHydrationWarning>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={`inline-block size-2 rounded-full ${last.dot}`} />
          {last.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {member.engagement_score === null ||
        member.engagement_score === undefined ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <Link
            href={`${detailHref}?tab=overview`}
            className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${eng.bg} ${eng.text}`}
            title={`Engagement score ${member.engagement_score}/100 — open Overview`}
          >
            {member.engagement_score}
          </Link>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        <span title="Union count of Aven messages, trades and brief views (last 7 days)">
          ⚡ {activity7d(member)}
        </span>
      </td>
      <td
        className="px-4 py-3 font-mono text-xs text-foreground"
        title="Total revenue since signup"
      >
        {formatUSD(ltvUsd(member))}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatDate(joinedAt(member))}
      </td>
      <td className="px-2 py-3">
        <RowActions
          member={member}
          onTier={onTier}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
          href={detailHref}
        />
      </td>
    </tr>
  );
}

function MemberCard({
  member,
  selected,
  onToggleSelect,
  onTier,
  onSuspend,
  onReactivate,
}: {
  member: AdminMembersListEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onTier: (tier: "standard" | "vip") => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const last = lastActiveColor(member.last_active_at);
  const eng = engagementTone(member.engagement_score);
  return (
    <li
      className={[
        "rounded-xl border bg-surface/40 p-3",
        selected ? "border-emerald/40 bg-emerald/[0.04]" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={`Select ${member.display_name ?? member.email}`}
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 size-4 shrink-0 cursor-pointer"
        />
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/members/${member.id}`}
            className="block"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {member.display_name ?? member.email}
              </p>
              {(() => {
                const s = memberStatusOf(member);
                return (
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadgeClass(s)}`}
                  >
                    {s ?? "—"}
                  </span>
                );
              })()}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {member.email}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={`inline-block size-1.5 rounded-full ${last.dot}`}
                />
                {last.label}
              </span>
              {member.engagement_score !== null &&
                member.engagement_score !== undefined && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${eng.bg} ${eng.text}`}
                  >
                    {member.engagement_score}
                  </span>
                )}
              <span title="Activity union count (last 7d)">
                ⚡ {activity7d(member)}
              </span>
              <span className="font-mono">
                {formatUSD(ltvUsd(member))}
              </span>
            </div>
          </Link>
        </div>
      </div>
      <div className="mt-2 flex justify-end" onClick={(e) => e.stopPropagation()}>
        <RowActions
          member={member}
          onTier={onTier}
          onSuspend={onSuspend}
          onReactivate={onReactivate}
          href={`/admin/members/${member.id}`}
        />
      </div>
    </li>
  );
}

function RowActions({
  member,
  onTier,
  onSuspend,
  onReactivate,
  href,
}: {
  member: AdminMembersListEntry;
  onTier: (tier: "standard" | "vip") => void;
  onSuspend: () => void;
  onReactivate: () => void;
  href: string;
}) {
  const router = useRouter();
  const isSuspended = statusGroup(memberStatusOf(member)) === "suspended";
  const items = [
    {
      label: "View details",
      onSelect: () => router.push(href),
    },
    ...(member.tier === "vip"
      ? [{ label: "Set to Standard", onSelect: () => onTier("standard") }]
      : [{ label: "Set to VIP", onSelect: () => onTier("vip") }]),
    isSuspended
      ? { label: "Reactivate", onSelect: onReactivate }
      : { label: "Suspend", onSelect: onSuspend, tone: "danger" as const },
  ];
  return (
    <div className="flex items-center gap-1">
      <Link
        href={href}
        aria-label="Open member detail"
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
      >
        <IconChevronRight size={16} stroke={1.75} aria-hidden />
      </Link>
      <ActionsMenu items={items} />
    </div>
  );
}
