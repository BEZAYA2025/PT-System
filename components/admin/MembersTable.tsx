"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type { AdminMembersListEntry } from "@/lib/admin";
import { ActionsMenu } from "./ActionsMenu";
import { MemberDetailDrawer } from "./MemberDetailDrawer";

interface Props {
  initialMembers: AdminMembersListEntry[] | null;
}

type FilterKind = "all" | "active" | "trial" | "cancelled" | "suspended";
type SortKey = "joined" | "status";
type SortDir = "asc" | "desc";

const FILTERS: Array<{ key: FilterKind; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "cancelled", label: "Cancelled" },
  { key: "suspended", label: "Suspended" },
];

const PAGE_SIZE = 25;

function statusGroup(status: string | null | undefined): FilterKind {
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

function timeAgoShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  const day = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (day < 1) return "today";
  if (day === 1) return "1 day ago";
  if (day < 30) return `${day} days ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr} yr ago`;
}

export function MembersTable({ initialMembers }: Props) {
  const router = useRouter();
  const [members, setMembers] = useState<AdminMembersListEntry[]>(
    initialMembers ?? [],
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKind>("all");
  const [sortKey, setSortKey] = useState<SortKey>("joined");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<
    { kind: "suspend" | "reactivate"; id: string; name: string } | null
  >(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = members;
    if (filter !== "all") {
      list = list.filter((m) => statusGroup(m.status) === filter);
    }
    if (q) {
      list = list.filter(
        (m) =>
          m.email.toLowerCase().includes(q) ||
          (m.display_name ?? "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sortKey === "joined") {
        const at = Date.parse(a.joined_at ?? a.created_at ?? "") || 0;
        const bt = Date.parse(b.joined_at ?? b.created_at ?? "") || 0;
        return sortDir === "asc" ? at - bt : bt - at;
      }
      const ag = statusGroup(a.status);
      const bg = statusGroup(b.status);
      return sortDir === "asc"
        ? ag.localeCompare(bg)
        : bg.localeCompare(ag);
    });
    return sorted;
  }, [members, query, filter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

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
              placeholder="Search by email or name"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {filtered.length.toLocaleString()} member
            {filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setPage(0);
              }}
              aria-pressed={filter === key}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                filter === key
                  ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface/40 md:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
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
                    label="Joined"
                    active={sortKey === "joined"}
                    dir={sortDir}
                    onClick={() => toggleSort("joined")}
                  />
                </th>
                <th className="px-4 py-3 font-medium">Trial Ends</th>
                <th className="w-[44px] px-2 py-3 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((m) => {
                const isTrial = statusGroup(m.status) === "trial";
                return (
                  <tr
                    key={m.id}
                    onClick={() => setDrawerId(m.id)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60"
                  >
                    <td className="px-4 py-3 text-foreground">
                      {m.display_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                          m.tier === "vip"
                            ? "border-emerald/30 bg-emerald/[0.08] text-emerald"
                            : "border-border bg-surface text-muted-foreground",
                        ].join(" ")}
                      >
                        {m.tier ?? "standard"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadgeClass(m.status)}`}
                      >
                        {m.status ?? "—"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-xs text-muted-foreground"
                      suppressHydrationWarning
                    >
                      {timeAgoShort(m.joined_at ?? m.created_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {isTrial
                        ? formatDate(m.trial_end ?? m.trial_ends_at)
                        : "—"}
                    </td>
                    <td
                      className="px-2 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MemberActions
                        member={m}
                        onView={() => setDrawerId(m.id)}
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <ul className="grid gap-2 md:hidden">
          {pageRows.map((m) => {
            const isTrial = statusGroup(m.status) === "trial";
            return (
              <li
                key={m.id}
                className="rounded-xl border border-border bg-surface/40 p-3"
              >
                <button
                  type="button"
                  onClick={() => setDrawerId(m.id)}
                  className="block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {m.display_name ?? m.email}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadgeClass(m.status)}`}
                    >
                      {m.status ?? "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.email}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      {(m.tier ?? "standard").toUpperCase()}
                      {" · "}
                      <span suppressHydrationWarning>
                        {timeAgoShort(m.joined_at ?? m.created_at)}
                      </span>
                    </span>
                    {isTrial && (
                      <span>
                        Trial ends {formatDate(m.trial_end ?? m.trial_ends_at)}
                      </span>
                    )}
                  </div>
                </button>
                <div
                  className="mt-2 flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MemberActions
                    member={m}
                    onView={() => setDrawerId(m.id)}
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
                </div>
              </li>
            );
          })}
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

      <MemberDetailDrawer
        memberId={drawerId}
        onClose={() => setDrawerId(null)}
        onChangeTier={(id, tier) => handleChangeTier(id, tier)}
        onSuspend={(id) => {
          const m = members.find((x) => x.id === id);
          setConfirm({
            kind: "suspend",
            id,
            name: m?.display_name ?? m?.email ?? id,
          });
        }}
        onReactivate={(id) => {
          const m = members.find((x) => x.id === id);
          setConfirm({
            kind: "reactivate",
            id,
            name: m?.display_name ?? m?.email ?? id,
          });
        }}
        busy={busy}
      />

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

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </>
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
      {active && (dir === "asc" ? (
        <IconArrowUp size={11} stroke={2} aria-hidden />
      ) : (
        <IconArrowDown size={11} stroke={2} aria-hidden />
      ))}
    </button>
  );
}

function MemberActions({
  member,
  onView,
  onTier,
  onSuspend,
  onReactivate,
}: {
  member: AdminMembersListEntry;
  onView: () => void;
  onTier: (tier: "standard" | "vip") => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  const isSuspended = statusGroup(member.status) === "suspended";
  const items = [
    { label: "View details", onSelect: onView },
    ...(member.tier === "vip"
      ? [{ label: "Set to Standard", onSelect: () => onTier("standard") }]
      : [{ label: "Set to VIP", onSelect: () => onTier("vip") }]),
    isSuspended
      ? { label: "Reactivate", onSelect: onReactivate }
      : { label: "Suspend", onSelect: onSuspend, tone: "danger" as const },
  ];
  return <ActionsMenu items={items} />;
}
