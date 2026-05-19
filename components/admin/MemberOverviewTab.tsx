"use client";

import {
  IconBolt,
  IconChartCandle,
  IconHeartbeat,
  IconLogin,
  IconMessage,
  IconWallet,
} from "@tabler/icons-react";
import type { LoginHistoryEntry, MemberDetail } from "@/lib/admin";

interface Props {
  member: MemberDetail;
  loginHistory: LoginHistoryEntry[];
}

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  // Backend may return either fraction (0.62) or percent (62) — keep
  // both shapes readable.
  const pct = n <= 1 ? n * 100 : n;
  return `${pct.toFixed(1)}%`;
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return (Date.now() - t) / (24 * 60 * 60 * 1000);
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = daysSince(iso);
  if (d === null) return "—";
  if (d < 1) {
    const hrs = Math.max(1, Math.round(d * 24));
    return `${hrs}h ago`;
  }
  const days = Math.round(d);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const mo = Math.round(days / 30);
  return `${mo} mo ago`;
}

type HealthTone = "healthy" | "at-risk" | "inactive";

function deriveHealth(member: MemberDetail): {
  tone: HealthTone;
  label: string;
  reason: string;
} {
  const score = member.engagement_score ?? null;
  const lastActiveDays = daysSince(member.last_active_at);
  const avenMessages = member.aven_messages_count_7d ?? 0;
  const trades = member.trades_count_7d ?? 0;

  // Inactive trumps everything — if they haven't logged in in three
  // weeks, the score doesn't matter.
  if (lastActiveDays !== null && lastActiveDays > 21) {
    return {
      tone: "inactive",
      label: "Inactive 🔴",
      reason: `No login in ${Math.round(lastActiveDays)} days. Worth a check-in.`,
    };
  }

  if (score !== null) {
    if (score >= 70) {
      return {
        tone: "healthy",
        label: "Healthy 🟢",
        reason: `Engagement ${score}/100 · ${avenMessages} Aven messages, ${trades} trades last 7d.`,
      };
    }
    if (score < 30) {
      return {
        tone: "at-risk",
        label: "At-Risk 🟡",
        reason: `Engagement ${score}/100. ${avenMessages} Aven messages, ${trades} trades last 7d — consider a personal nudge.`,
      };
    }
    return {
      tone: "at-risk",
      label: "Mid 🟡",
      reason: `Engagement ${score}/100. ${avenMessages} Aven messages, ${trades} trades last 7d.`,
    };
  }

  // No score — fall back on raw activity counts.
  if (avenMessages + trades === 0 && (lastActiveDays ?? 0) > 7) {
    return {
      tone: "at-risk",
      label: "Quiet 🟡",
      reason: "No Aven messages or trades in the last week.",
    };
  }
  return {
    tone: "healthy",
    label: "Active 🟢",
    reason: `${avenMessages} Aven messages, ${trades} trades last 7d.`,
  };
}

const HEALTH_CLASSES: Record<HealthTone, { bar: string; pill: string }> = {
  healthy: {
    bar: "border-emerald/30 bg-emerald/[0.06]",
    pill: "bg-emerald/[0.14] text-emerald",
  },
  "at-risk": {
    bar: "border-amber-500/30 bg-amber-500/[0.05]",
    pill: "bg-amber-500/[0.14] text-amber-300",
  },
  inactive: {
    bar: "border-red-400/30 bg-red-500/[0.05]",
    pill: "bg-red-500/[0.14] text-red-300",
  },
};

function uaLine(entry: LoginHistoryEntry): string {
  const parsed = entry.user_agent_parsed;
  if (parsed) {
    const browser = parsed.browser ?? "";
    const os = parsed.os ?? "";
    if (browser && os) return `${browser} on ${os}`;
    if (browser) return browser;
    if (os) return os;
  }
  if (entry.user_agent) return entry.user_agent;
  return "Unknown device";
}

export function MemberOverviewTab({ member, loginHistory }: Props) {
  const health = deriveHealth(member);
  const healthClasses = HEALTH_CLASSES[health.tone];

  const avenTotal =
    member.aven_messages ??
    member.total_aven_messages ??
    null;
  const tradesTotal = member.total_trades ?? null;
  const winRate = member.win_rate ?? null;

  const aven7 = member.aven_messages_count_7d ?? 0;
  const trades7 = member.trades_count_7d ?? 0;
  const briefs7 = member.brief_views_count_7d ?? 0;
  const activitySum = aven7 + trades7 + briefs7;
  const avenPct = activitySum > 0 ? (aven7 / activitySum) * 100 : 0;
  const tradesPct = activitySum > 0 ? (trades7 / activitySum) * 100 : 0;
  const briefsPct = activitySum > 0 ? (briefs7 / activitySum) * 100 : 0;

  const recentLogins = loginHistory.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* KPI grid — 2x2 on desktop, single column on mobile. Each card
          stays terse and surfaces the headline metric loud. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KPICard
          icon={IconWallet}
          label="Lifetime Value"
          value={formatUSD(member.lifetime_value_usd)}
          hint="Total revenue since signup"
        />
        <KPICard
          icon={IconBolt}
          label="Engagement Score"
          value={
            member.engagement_score !== null &&
            member.engagement_score !== undefined
              ? `${member.engagement_score}/100`
              : "—"
          }
          hint={health.label.replace(/[^A-Za-z- ]/g, "").trim()}
        />
        <KPICard
          icon={IconChartCandle}
          label="Total Trades"
          value={tradesTotal !== null ? tradesTotal.toLocaleString() : "—"}
          hint={
            winRate !== null
              ? `${formatPct(winRate)} win-rate`
              : "Lifetime trades"
          }
        />
        <KPICard
          icon={IconMessage}
          label="Total Aven Messages"
          value={avenTotal !== null ? avenTotal.toLocaleString() : "—"}
          hint="All conversations combined"
        />
      </div>

      {/* Health indicator — full-width, prominent. The label carries
          the emoji-glyph so the row reads at a glance even without
          colour. */}
      <section
        className={`rounded-2xl border p-5 ${healthClasses.bar}`}
        aria-label="Member health"
      >
        <div className="flex flex-wrap items-start gap-4">
          <span
            className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${healthClasses.pill}`}
          >
            <IconHeartbeat size={20} stroke={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              {health.label}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{health.reason}</p>
          </div>
        </div>
      </section>

      {/* Activity Last 7d — total counts plus a single stacked bar
          showing the Aven / Trades / Brief-view share. Per-day
          break-down arrives once the backend ships a daily-counts
          endpoint; until then this still surfaces the activity
          composition meaningfully. */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Activity · Last 7 days
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            {activitySum} total events
          </p>
        </header>
        {activitySum === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No activity in the last 7 days.
          </p>
        ) : (
          <>
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-background">
              <div
                aria-label={`${aven7} Aven messages`}
                className="h-full bg-emerald"
                style={{ width: `${avenPct}%` }}
              />
              <div
                aria-label={`${trades7} trades`}
                className="h-full bg-sky-400"
                style={{ width: `${tradesPct}%` }}
              />
              <div
                aria-label={`${briefs7} brief views`}
                className="h-full bg-amber-400"
                style={{ width: `${briefsPct}%` }}
              />
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2 rounded-full bg-emerald" />
                <span className="text-muted-foreground">Aven messages</span>
                <span className="ml-auto font-mono text-foreground">{aven7}</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2 rounded-full bg-sky-400" />
                <span className="text-muted-foreground">Trades</span>
                <span className="ml-auto font-mono text-foreground">{trades7}</span>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden className="size-2 rounded-full bg-amber-400" />
                <span className="text-muted-foreground">Brief views</span>
                <span className="ml-auto font-mono text-foreground">{briefs7}</span>
              </li>
            </ul>
          </>
        )}
      </section>

      {/* Recent activity timeline — driven by login-history for now.
          Once the backend ships a generic events feed, trade-opens,
          Aven-conversation-starts, and brief-reads will land in this
          same component. */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Recent activity
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Login history (last 30 days). Trade and Aven events join
            this feed once the backend events endpoint lands.
          </p>
        </header>
        {recentLogins.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No logins recorded in the last 30 days.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {recentLogins.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald/[0.10] text-emerald"
                >
                  <IconLogin size={13} stroke={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    Signed in · {uaLine(entry)}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {timeAgo(entry.created_at)}
                    {entry.ip_address && (
                      <> · {entry.ip_address}</>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-5">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">
          <Icon size={14} stroke={1.75} />
        </span>
      </header>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
    </article>
  );
}
