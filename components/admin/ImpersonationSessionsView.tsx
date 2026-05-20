"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconLoader2,
  IconLockSquare,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { Toast, type ToastState } from "@/components/Toast";
import type { ImpersonationSession } from "@/lib/admin";

interface Props {
  initialSessions: ImpersonationSession[] | null;
}

type StatusFilter = "all" | "active" | "ended";

function formatDateTime(iso: string | null | undefined): string {
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

function durationLabel(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start) return "—";
  const startT = Date.parse(start);
  if (!Number.isFinite(startT)) return "—";
  const endT = end ? Date.parse(end) : Date.now();
  const ms = (Number.isFinite(endT) ? endT : Date.now()) - startT;
  if (ms < 0) return "—";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

function isActive(s: ImpersonationSession): boolean {
  if (s.ended_at) return false;
  if (s.expires_at) {
    const t = Date.parse(s.expires_at);
    if (Number.isFinite(t) && t <= Date.now()) return false;
  }
  return true;
}

function statusBadgeClass(s: ImpersonationSession): {
  pill: string;
  label: string;
} {
  if (s.ended_at)
    return {
      pill: "border-border bg-surface text-muted-foreground",
      label: "Manual exit",
    };
  if (s.expires_at) {
    const t = Date.parse(s.expires_at);
    if (Number.isFinite(t) && t <= Date.now()) {
      return {
        pill: "border-amber-500/30 bg-amber-500/[0.06] text-amber-200",
        label: "Expired",
      };
    }
  }
  return {
    pill: "border-emerald/30 bg-emerald/[0.08] text-emerald",
    label: "Active",
  };
}

export function ImpersonationSessionsView({ initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState<ImpersonationSession[]>(
    initialSessions ?? [],
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => {
      const active = isActive(s);
      if (statusFilter === "active" && !active) return false;
      if (statusFilter === "ended" && active) return false;
      if (q) {
        const haystack = [
          s.target_member_email,
          s.target_member_name,
          s.target_member_id,
          s.admin_id,
          s.reason,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [sessions, query, statusFilter]);

  const handleExit = async (session: ImpersonationSession) => {
    if (exitingId) return;
    setExitingId(session.id);
    try {
      const res = await fetch("/api/proxy/admin/impersonation/exit", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Backend's exit closes the current session — refetch the list
      // to pick up the updated state. Optimistically mark this row
      // ended in the meantime.
      setSessions((prev) =>
        prev.map((s) =>
          s.id === session.id
            ? { ...s, ended_at: new Date().toISOString() }
            : s,
        ),
      );
      setToast({ message: "Impersonation exited", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Exit failed · ${err.message}`
            : "Exit failed",
        tone: "error",
      });
    } finally {
      setExitingId(null);
    }
  };

  if (!initialSessions) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-6">
        <p className="flex items-center gap-2 text-sm text-amber-200">
          <IconAlertCircle size={16} stroke={1.75} aria-hidden />
          Couldn&apos;t reach the impersonation-sessions service.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Impersonation Sessions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Active and historical admin-into-member sessions.
        </p>
      </header>

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search member, admin, reason"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: "all", label: "All" },
              { key: "active", label: "Active" },
              { key: "ended", label: "Ended" },
            ] as Array<{ key: StatusFilter; label: string }>
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              aria-pressed={statusFilter === key}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium",
                statusFilter === key
                  ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center">
          <IconLockSquare
            size={28}
            stroke={1.5}
            className="text-muted-foreground"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            No impersonation sessions
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
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Target member</th>
                <th className="px-3 py-2 font-medium">Admin</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Duration</th>
                <th className="px-3 py-2 font-medium">Reason</th>
                <th className="w-[100px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const status = statusBadgeClass(s);
                const active = isActive(s);
                return (
                  <tr
                    key={s.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${status.pill}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {s.target_member_id ? (
                        <Link
                          href={`/admin/members/${s.target_member_id}`}
                          className="text-sm text-foreground hover:text-emerald"
                        >
                          {s.target_member_name ??
                            s.target_member_email ??
                            s.target_member_id}
                        </Link>
                      ) : (
                        <span className="text-sm text-foreground">
                          {s.target_member_name ??
                            s.target_member_email ??
                            "—"}
                        </span>
                      )}
                      {s.target_member_email && (
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {s.target_member_email}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                        <IconUser
                          size={11}
                          stroke={1.75}
                          aria-hidden
                        />
                        {s.admin_id?.slice(0, 8) ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(s.started_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {durationLabel(s.started_at, s.ended_at)}
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      {s.reason ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {active && (
                        <button
                          type="button"
                          onClick={() => handleExit(s)}
                          disabled={exitingId === s.id}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-2 text-[11px] font-semibold text-amber-200 hover:bg-amber-500/[0.14] disabled:opacity-60"
                        >
                          {exitingId === s.id && (
                            <IconLoader2
                              size={11}
                              stroke={2}
                              className="animate-spin"
                              aria-hidden
                            />
                          )}
                          Exit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
