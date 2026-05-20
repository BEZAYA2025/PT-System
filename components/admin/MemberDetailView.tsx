"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconActivity,
  IconArrowLeft,
  IconCalendar,
  IconClock,
  IconCopy,
  IconLoader2,
  IconLockSquare,
  IconMail,
  IconSend,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type {
  LoginHistoryEntry,
  MemberDetail,
  MemberEvent,
} from "@/lib/admin";
import { formatDate, relativeShort } from "@/lib/admin-format";
import { ActionsMenu } from "./ActionsMenu";
import { MemberOverviewTab } from "./MemberOverviewTab";
import { MemberSubscriptionTab } from "./MemberSubscriptionTab";
import { MemberTradesTab } from "./MemberTradesTab";
import { MemberAvenTab } from "./MemberAvenTab";
import { MemberActivityTab } from "./MemberActivityTab";
import { MemberNotesTab } from "./MemberNotesTab";

type TabKey =
  | "overview"
  | "subscription"
  | "trades"
  | "aven"
  | "activity"
  | "notes";

const TABS: ReadonlyArray<{ key: TabKey; label: string; star?: boolean }> = [
  { key: "overview", label: "Overview" },
  { key: "subscription", label: "Subscription" },
  { key: "trades", label: "Trades" },
  { key: "aven", label: "Aven", star: true },
  { key: "activity", label: "Activity" },
  { key: "notes", label: "Notes & Audit" },
];

function isTabKey(v: string | null): v is TabKey {
  return (
    v === "overview" ||
    v === "subscription" ||
    v === "trades" ||
    v === "aven" ||
    v === "activity" ||
    v === "notes"
  );
}

function getInitials(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return (
    (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
  ).toUpperCase();
}

function statusBadgeClass(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "active" || s === "past_due")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (s === "trial" || s === "trialing")
    return "border-sky-400/30 bg-sky-400/[0.08] text-sky-300";
  if (s === "suspended")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  return "border-border bg-surface text-muted-foreground";
}

interface Props {
  member: MemberDetail;
  events: MemberEvent[];
  loginHistory: LoginHistoryEntry[];
}

export function MemberDetailView({
  member: initialMember,
  events,
  loginHistory,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "overview";

  const [member, setMember] = useState<MemberDetail>(initialMember);
  const [confirm, setConfirm] = useState<
    "suspend" | "reactivate" | null
  >(null);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [impersonateBusy, setImpersonateBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [copied, setCopied] = useState(false);

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "overview") {
      params.delete("tab");
    } else {
      params.set("tab", key);
    }
    const qs = params.toString();
    router.replace(`/admin/members/${member.id}${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(member.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silent
    }
  };

  const callAction = async (
    url: string,
    successMsg: string,
    patch?: (m: MemberDetail) => MemberDetail,
  ) => {
    if (busy) return false;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (patch) setMember(patch);
      setToast({ message: successMsg, tone: "success" });
      router.refresh();
      return true;
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Failed · ${err.message}` : "Failed",
        tone: "error",
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleTier = async (tier: "standard" | "vip") => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/tier`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMember((prev) => ({ ...prev, tier }));
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

  const handleSuspend = async () => {
    const ok = await callAction(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/suspend`,
      "Member suspended",
      (m) => ({ ...m, status: "suspended" }),
    );
    if (ok) setConfirm(null);
  };

  const handleReactivate = async () => {
    const ok = await callAction(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/reactivate`,
      "Member reactivated",
      (m) => ({ ...m, status: "active" }),
    );
    if (ok) setConfirm(null);
  };

  // §27 O4: effective_status carries the canonical display value
  // (trialing vs active distinguished even though raw subscription_status
  // is "active" for both).
  const effectiveStatus =
    member.effective_status ??
    member.subscription_status_display ??
    (member.is_trial ? "trialing" : null) ??
    member.subscription_status ??
    member.status ??
    null;
  const isSuspended = (effectiveStatus ?? "").toLowerCase() === "suspended";
  const displayName = member.display_name?.trim() || member.email;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/members"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconArrowLeft size={13} stroke={1.75} aria-hidden />
        Back to Members
      </Link>

      <section className="rounded-2xl border border-border bg-surface/40 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald/[0.14] font-mono text-xl font-semibold text-emerald"
            >
              {getInitials(displayName)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {displayName}
                </h1>
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
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusBadgeClass(effectiveStatus)}`}
                >
                  {effectiveStatus ?? "—"}
                </span>
              </div>
              <p className="mt-1.5 inline-flex items-center gap-2 text-xs text-muted-foreground">
                {member.email}
                <button
                  type="button"
                  onClick={copyEmail}
                  className="inline-flex items-center gap-0.5 text-[11px] text-emerald hover:text-emerald-hover"
                >
                  <IconCopy size={11} stroke={1.75} aria-hidden />
                  {copied ? "Copied" : "Copy"}
                </button>
              </p>
              {/* Quick facts — mirror the at-a-glance columns from
                  the Members list (Joined, Last Active, Activity 7d)
                  so the detail page surfaces the same headline
                  values without making the founder hunt for them
                  across tabs. Empty values still render as "—" so
                  the row is positionally consistent across members. */}
              <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                <div className="inline-flex items-center gap-1">
                  <IconCalendar size={11} stroke={1.75} aria-hidden />
                  <dt className="font-mono uppercase tracking-wider">
                    Joined
                  </dt>
                  <dd className="text-foreground">
                    {formatDate(
                      // Spec §25 ships `joined` on the list endpoint
                      // and `signed_up_at` on the detail endpoint —
                      // include BOTH plus the legacy fallbacks so the
                      // header doesn't blank out on a detail-only
                      // payload (root cause of baba's empty Joined).
                      member.joined ??
                        member.signed_up_at ??
                        member.joined_at ??
                        member.created_at,
                    )}
                  </dd>
                </div>
                <div className="inline-flex items-center gap-1">
                  <IconClock size={11} stroke={1.75} aria-hidden />
                  <dt className="font-mono uppercase tracking-wider">
                    Last active
                  </dt>
                  <dd className="text-foreground">
                    {relativeShort(
                      // Same defensive widening — some deploys put the
                      // last-touch timestamp under last_login_at on the
                      // detail endpoint while the list keeps
                      // last_active_at. Read both.
                      member.last_active_at ?? member.last_login_at,
                    )}
                  </dd>
                </div>
                <div
                  className="inline-flex items-center gap-1"
                  title="Union count of Aven messages, trades and brief views (last 7d)"
                >
                  <IconActivity size={11} stroke={1.75} aria-hidden />
                  <dt className="font-mono uppercase tracking-wider">
                    Activity 7d
                  </dt>
                  <dd className="font-mono text-foreground">
                    {member.engagement?.activity_7d_total ??
                      member.activity_7d ??
                      (member.aven_messages_count_7d ?? 0) +
                        (member.trades_count_7d ?? 0) +
                        (member.brief_views_count_7d ?? 0)}
                  </dd>
                </div>
              </dl>
              {member.tags && member.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {member.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => switchTab("notes")}
                    className="text-[11px] text-emerald hover:text-emerald-hover"
                  >
                    + Add
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              title="Coming in Sprint 3"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground opacity-60 disabled:cursor-not-allowed"
            >
              <IconMail size={13} stroke={1.75} />
              Send Email
            </button>
            <button
              type="button"
              disabled
              title="Coming in Sprint 3"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground opacity-60 disabled:cursor-not-allowed"
            >
              <IconSend size={13} stroke={1.75} />
              Send Telegram
            </button>
            <button
              type="button"
              onClick={() => setImpersonateOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-3 text-xs font-semibold text-amber-200 hover:bg-amber-500/[0.14]"
            >
              <IconLockSquare size={13} stroke={1.75} />
              Impersonate
            </button>
            <ActionsMenu
              label="Change tier"
              items={[
                {
                  label: "Set to Standard",
                  onSelect: () => handleTier("standard"),
                  disabled: member.tier === "standard",
                },
                {
                  label: "Set to VIP",
                  onSelect: () => handleTier("vip"),
                  disabled: member.tier === "vip",
                },
              ]}
            />
            {isSuspended ? (
              <button
                type="button"
                onClick={() => setConfirm("reactivate")}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md border border-emerald/40 bg-emerald/[0.08] px-3 text-xs font-semibold text-emerald hover:bg-emerald/[0.14] disabled:opacity-60"
              >
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm("suspend")}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-xs font-semibold text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
              >
                Suspend
              </button>
            )}
          </div>
        </div>
      </section>

      <nav
        aria-label="Member detail tabs"
        // Minimal: tab headings only, active one carries the emerald
        // underline marker. No sticky positioning, no row-level
        // background or border — Paul wants the headings to read as
        // text, not as a chrome strip. Mobile still gets horizontal
        // scroll so six tabs don't squish; desktop flexes naturally.
        className="overflow-x-auto sm:overflow-visible"
      >
        <ul className="flex min-w-max gap-1 sm:min-w-0">
          {TABS.map(({ key, label, star }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex h-11 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                  {star && (
                    <span className="text-amber-300" aria-hidden>
                      ⭐
                    </span>
                  )}
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
        {activeTab === "overview" && (
          <MemberOverviewTab
            member={member}
            events={events}
            loginHistory={loginHistory}
          />
        )}
        {activeTab === "subscription" && (
          <MemberSubscriptionTab member={member} />
        )}
        {activeTab === "trades" && <MemberTradesTab member={member} />}
        {activeTab === "aven" && <MemberAvenTab member={member} />}
        {activeTab === "activity" && (
          <MemberActivityTab member={member} loginHistory={loginHistory} />
        )}
        {activeTab === "notes" && <MemberNotesTab member={member} />}
      </section>

      <Modal
        open={confirm === "suspend"}
        onClose={() => !busy && setConfirm(null)}
        title="Suspend member?"
        description={displayName}
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
              onClick={handleSuspend}
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
        open={confirm === "reactivate"}
        onClose={() => !busy && setConfirm(null)}
        title="Reactivate member?"
        description={displayName}
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
              onClick={handleReactivate}
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
        open={impersonateOpen}
        onClose={() => !impersonateBusy && setImpersonateOpen(false)}
        title={`Impersonate ${displayName}?`}
        description="Read-only session, 1h expiry. All actions are audited."
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            You&apos;ll see the dashboard exactly as the member does.
            Mutating actions stay blocked on the backend even if a UI
            control isn&apos;t disabled.
          </p>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason (required)
            </span>
            <textarea
              value={impersonateReason}
              onChange={(e) => setImpersonateReason(e.target.value)}
              rows={3}
              placeholder="e.g. debugging trade-card visual bug they reported"
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setImpersonateOpen(false)}
              disabled={impersonateBusy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (impersonateBusy) return;
                if (!impersonateReason.trim()) return;
                setImpersonateBusy(true);
                try {
                  const res = await fetch(
                    `/api/proxy/admin/members/${encodeURIComponent(member.id)}/impersonate`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        reason: impersonateReason.trim(),
                      }),
                    },
                  );
                  if (!res.ok) {
                    const data = (await res.json().catch(() => null)) as {
                      message?: string;
                      error?: string;
                    } | null;
                    throw new Error(
                      data?.message ??
                        data?.error ??
                        `HTTP ${res.status}`,
                    );
                  }
                  // Hard nav so the new access_token cookie takes
                  // effect for the next SSR pass.
                  window.location.href = "/dashboard";
                } catch (err) {
                  setToast({
                    message:
                      err instanceof Error
                        ? `Impersonate failed · ${err.message}`
                        : "Impersonate failed",
                    tone: "error",
                  });
                  setImpersonateBusy(false);
                }
              }}
              disabled={impersonateBusy || !impersonateReason.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.10] px-3 text-sm font-semibold text-amber-100 hover:bg-amber-500/[0.18] disabled:opacity-60"
            >
              {impersonateBusy ? (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              ) : (
                <IconLockSquare size={14} stroke={1.75} aria-hidden />
              )}
              Confirm impersonate
            </button>
          </div>
        </div>
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

