import Link from "next/link";
import {
  IconArrowRight,
  IconClipboardCheck,
  IconCircleCheck,
  IconCircleDot,
  IconExclamationCircle,
  IconLockSquare,
  IconPlus,
  IconUsers,
} from "@tabler/icons-react";
import { requireUser } from "@/lib/dal";
import {
  fetchAdminImpersonationSessions,
  fetchAdminMembers,
  fetchAdminMrr,
  fetchAdminPendingBriefings,
  fetchAdminSystemHealth,
  type AdminMembersListEntry,
  type ImpersonationSession,
} from "@/lib/admin";
import { KPICard } from "@/components/admin/KPICard";

export const dynamic = "force-dynamic";

function formatToday(now = new Date()): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function isActive(member: AdminMembersListEntry): boolean {
  const s = (member.status ?? "").toLowerCase();
  return s === "active" || s === "trialing" || s === "trial";
}

function isImpersonationActive(s: ImpersonationSession): boolean {
  if (s.ended_at) return false;
  if (s.expires_at) {
    const t = Date.parse(s.expires_at);
    if (Number.isFinite(t) && t <= Date.now()) return false;
  }
  return true;
}

function joinedWithinDays(member: AdminMembersListEntry, days: number): boolean {
  const raw = member.joined_at ?? member.created_at;
  if (!raw) return false;
  const t = Date.parse(raw);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < days * 24 * 60 * 60 * 1000;
}

export default async function AdminOverviewPage() {
  const user = await requireUser();
  const displayName = user.display_name?.trim() || user.email;

  const [membersRes, mrrRes, pendingRes, healthRes, impSessions] =
    await Promise.all([
      fetchAdminMembers(),
      fetchAdminMrr(),
      fetchAdminPendingBriefings(),
      fetchAdminSystemHealth(),
      fetchAdminImpersonationSessions(),
    ]);

  const activeImpersonations = (impSessions ?? []).filter(
    (s) => isImpersonationActive(s),
  );

  const activeCount = membersRes
    ? membersRes.members.filter(isActive).length
    : 0;
  const new7d = membersRes
    ? membersRes.members.filter((m) => joinedWithinDays(m, 7)).length
    : 0;

  const pendingCount = pendingRes?.briefings.length ?? 0;

  const healthTone =
    healthRes?.overall === "down"
      ? "danger"
      : healthRes?.overall === "degraded"
        ? "warning"
        : "success";
  const healthLabel =
    healthRes?.overall === "down"
      ? "Down"
      : healthRes?.overall === "degraded"
        ? "Degraded"
        : "Operational";
  const healthHint = healthRes
    ? `${healthRes.services.length} service${healthRes.services.length === 1 ? "" : "s"} monitored`
    : null;

  const mrrLabel =
    mrrRes && mrrRes.current > 0
      ? formatUSD(mrrRes.current)
      : mrrRes
        ? "$0"
        : "—";
  const mrrHint =
    mrrRes && typeof mrrRes.delta_pct === "number"
      ? `${mrrRes.delta_pct >= 0 ? "+" : ""}${mrrRes.delta_pct.toFixed(1)}% vs last month`
      : "Monthly recurring revenue";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground" suppressHydrationWarning>
          {formatToday()}
        </p>
      </header>

      <section aria-label="Key metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KPICard
            title="Active Members"
            value={membersRes ? activeCount.toLocaleString() : "—"}
            hint={
              membersRes
                ? new7d > 0
                  ? `+${new7d} in the last 7 days`
                  : "No new joins this week"
                : null
            }
            error={!membersRes}
          />
          <KPICard
            title="MRR"
            value={mrrLabel}
            hint={mrrHint}
            error={!mrrRes}
          />
          <KPICard
            title="Pending Briefings"
            value={pendingRes ? pendingCount.toLocaleString() : "—"}
            hint={
              pendingRes
                ? pendingCount === 0
                  ? "All caught up"
                  : `${pendingCount} awaiting review`
                : null
            }
            href={pendingCount > 0 ? "/admin/briefings" : undefined}
            cta={pendingCount > 0 ? "Review now" : undefined}
            tone={pendingCount > 0 ? "warning" : "default"}
            error={!pendingRes}
          />
          <KPICard
            title="System Status"
            value={
              <span className="inline-flex items-center gap-2">
                <SystemDot tone={healthTone} />
                {healthLabel}
              </span>
            }
            hint={healthHint}
            tone={healthTone}
            error={!healthRes}
          />
        </div>
      </section>

      {activeImpersonations.length > 0 && (
        <section
          aria-label="Active impersonations"
          className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] p-5"
        >
          <header className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-amber-200">
              <IconLockSquare size={14} stroke={2} aria-hidden />
              Active impersonations · {activeImpersonations.length}
            </h2>
            <Link
              href="/admin/impersonation-sessions"
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-200 hover:text-amber-100"
            >
              View all
              <IconArrowRight size={11} stroke={2} aria-hidden />
            </Link>
          </header>
          <ul className="mt-3 space-y-2">
            {activeImpersonations.slice(0, 5).map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-background px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    {s.target_member_name ??
                      s.target_member_email ??
                      s.target_member_id ??
                      "—"}
                  </p>
                  {s.reason && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {s.reason}
                    </p>
                  )}
                </div>
                <Link
                  href="/admin/impersonation-sessions"
                  className="font-mono text-[10px] uppercase tracking-wider text-amber-200 hover:text-amber-100"
                >
                  Manage →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Quick actions">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Quick actions
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickActionCard
            href="/admin/briefings"
            icon={IconClipboardCheck}
            title="Approve today's briefing"
            description={
              pendingCount > 0
                ? `${pendingCount} pending review`
                : "Nothing pending right now"
            }
          />
          <QuickActionCard
            href="/admin/members"
            icon={IconUsers}
            title="View all members"
            description={
              membersRes
                ? `${membersRes.total ?? membersRes.members.length} on the books`
                : "Manage subscriptions and tier"
            }
          />
          <QuickActionCard
            href="/admin/discount-codes"
            icon={IconPlus}
            title="Create discount code"
            description="Promo, beta access, affiliate"
          />
        </div>
      </section>
    </div>
  );
}

function SystemDot({ tone }: { tone: "success" | "warning" | "danger" }) {
  if (tone === "success")
    return <IconCircleCheck size={20} stroke={2} aria-hidden />;
  if (tone === "warning")
    return <IconCircleDot size={20} stroke={2} aria-hidden />;
  return <IconExclamationCircle size={20} stroke={2} aria-hidden />;
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface/50 p-4 transition-colors hover:border-emerald/40 hover:bg-emerald/[0.03]"
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-emerald transition-colors group-hover:border-emerald/40">
        <Icon size={18} stroke={1.75} />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
