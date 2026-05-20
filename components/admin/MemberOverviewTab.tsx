"use client";

import {
  IconActivity,
  IconBolt,
  IconChartCandle,
  IconClipboardCheck,
  IconHeartbeat,
  IconLogin,
  IconMessage,
  IconWallet,
} from "@tabler/icons-react";
import type {
  LoginHistoryEntry,
  MemberDetail,
  MemberEvent,
} from "@/lib/admin";

interface Props {
  member: MemberDetail;
  events: MemberEvent[];
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

// Backend §25 Auftrag G: engagement-block on the detail endpoint is
// nested ({ engagement: { score, activity_7d_total } }) where the list
// endpoint keeps the row-level `engagement_score` / `activity_7d`
// shape. Prefer the nested values, fall back to flat — single helper
// so every read site stays consistent.
function engagementScoreOf(member: MemberDetail): number | null {
  return member.engagement?.score ?? member.engagement_score ?? null;
}

function activity7dParts(member: MemberDetail): {
  total: number;
  avenMessages: number | null;
  trades: number | null;
  hasBreakdown: boolean;
} {
  const aven =
    typeof member.aven_messages_count_7d === "number"
      ? member.aven_messages_count_7d
      : null;
  const trades =
    typeof member.trades_count_7d === "number" ? member.trades_count_7d : null;
  const briefs =
    typeof member.brief_views_count_7d === "number"
      ? member.brief_views_count_7d
      : 0;
  const hasBreakdown = aven !== null || trades !== null;
  const breakdownSum = (aven ?? 0) + (trades ?? 0) + briefs;
  const total =
    member.engagement?.activity_7d_total ??
    (typeof member.activity_7d === "number" ? member.activity_7d : null) ??
    (hasBreakdown ? breakdownSum : 0);
  return { total, avenMessages: aven, trades, hasBreakdown };
}

function activityBlurb(member: MemberDetail): string {
  const { total, avenMessages, trades, hasBreakdown } = activity7dParts(member);
  if (hasBreakdown) {
    return `${avenMessages ?? 0} Aven messages, ${trades ?? 0} trades last 7d.`;
  }
  return `${total} activit${total === 1 ? "y" : "ies"} last 7d.`;
}

function deriveHealth(member: MemberDetail): {
  tone: HealthTone;
  label: string;
  reason: string;
} {
  const score = engagementScoreOf(member);
  const lastActiveDays = daysSince(member.last_active_at);
  const { total: activityTotal } = activity7dParts(member);

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
        reason: `Engagement ${score}/100 · ${activityBlurb(member)}`,
      };
    }
    if (score < 30) {
      return {
        tone: "at-risk",
        label: "At-Risk 🟡",
        reason: `Engagement ${score}/100. ${activityBlurb(member)} Consider a personal nudge.`,
      };
    }
    return {
      tone: "at-risk",
      label: "Mid 🟡",
      reason: `Engagement ${score}/100. ${activityBlurb(member)}`,
    };
  }

  // No score — fall back on raw activity counts.
  if (activityTotal === 0 && (lastActiveDays ?? 0) > 7) {
    return {
      tone: "at-risk",
      label: "Quiet 🟡",
      reason: "No activity in the last week.",
    };
  }
  return {
    tone: "healthy",
    label: "Active 🟢",
    reason: activityBlurb(member),
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

export function MemberOverviewTab({ member, events, loginHistory }: Props) {
  const health = deriveHealth(member);
  const healthClasses = HEALTH_CLASSES[health.tone];

  const engScore = engagementScoreOf(member);
  const avenTotal =
    member.total_aven_messages ??
    member.aven_messages ??
    null;
  const tradesTotal = member.total_trades ?? null;
  // §25.B-2: total_pnl_usd is on the detail endpoint as a top-level
  // field. Backend may also expose it under trades_summary; read both.
  const totalPnl =
    member.total_pnl_usd ??
    member.trades_summary?.total_pnl_usd ??
    member.total_pnl ??
    null;
  // Backend §25 Auftrag G: trades_summary.win_rate (0..1) is the new
  // canonical home; trades_summary.win_rate_pct (0..100) is an
  // alternate shape. Older deploys ship the top-level win_rate.
  // formatPct() handles both 0..1 and 0..100 scales so either path
  // renders correctly.
  const winRate =
    member.trades_summary?.win_rate ??
    member.trades_summary?.win_rate_pct ??
    member.win_rate ??
    member.win_rate_pct ??
    null;

  const activity = activity7dParts(member);
  // Stack only renders when backend ships the breakdown (brief_views
  // is intentionally hidden — it's currently always 0 because the
  // /api/track wire isn't FE-side live yet; folded back in once it
  // ships and starts contributing). Otherwise we show a single
  // headline number.
  const aven7 = activity.avenMessages ?? 0;
  const trades7 = activity.trades ?? 0;
  const stackSum = aven7 + trades7;
  const avenPct = stackSum > 0 ? (aven7 / stackSum) * 100 : 0;
  const tradesPct = stackSum > 0 ? (trades7 / stackSum) * 100 : 0;

  // Events feed wins when populated — it's the merged signal stream
  // (logins + trades + Aven starts + brief reads). When the backend
  // returns an empty array we synth equivalent entries from the
  // login-history payload so the timeline still has content for
  // members whose events row is sparse.
  const timeline = events.length > 0 ? events : loginsAsEvents(loginHistory);
  // P3 follow-up: 12 was too tight — for engaged members (baba ran
  // ~76 events in 7d alone) the timeline looked thin compared to
  // their real activity. 30 fits a typical week of dense use without
  // turning the consolidated section back into a tall scroll-block.
  const TIMELINE_CAP = 30;
  const recentTimeline = timeline.slice(0, TIMELINE_CAP);
  const timelineTruncated = timeline.length > TIMELINE_CAP;

  return (
    <div className="space-y-6">
      {/* KPI grid — 2x2 on desktop, single column on mobile. Each card
          stays terse and surfaces the headline metric loud. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KPICard
          icon={IconWallet}
          label="Lifetime Value"
          value={formatUSD(member.ltv_usd ?? member.lifetime_value_usd)}
          hint="Total revenue since signup"
        />
        <KPICard
          icon={IconBolt}
          label="Engagement Score"
          value={engScore !== null ? `${engScore}/100` : "—"}
          hint={health.label.replace(/[^A-Za-z- ]/g, "").trim()}
        />
        <KPICard
          icon={IconChartCandle}
          label="Total Trades"
          value={tradesTotal !== null ? tradesTotal.toLocaleString() : "—"}
          hint={
            // Pack win-rate + PnL into the hint so both surface at a
            // glance without breaking the 2x2 KPI grid. ONLY the PnL
            // number gets the sign-aware tone (emerald / red / muted)
            // — the "PnL" label itself stays muted alongside win-rate
            // so the row still reads as one supporting line, not a
            // shouting tag.
            winRate !== null || totalPnl !== null ? (
              <>
                {winRate !== null && <>{formatPct(winRate)} win</>}
                {winRate !== null && totalPnl !== null && " · "}
                {totalPnl !== null && (
                  <>
                    PnL{" "}
                    <span
                      className={
                        totalPnl > 0
                          ? "font-semibold text-emerald"
                          : totalPnl < 0
                            ? "font-semibold text-red-300"
                            : ""
                      }
                    >
                      {totalPnl > 0 ? "+" : ""}
                      {formatUSD(totalPnl)}
                    </span>
                  </>
                )}
              </>
            ) : (
              "Lifetime trades"
            )
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

      {/* Activity — P3: 7d summary + 30d timeline collapsed into ONE
          section. Header shows the 7d total at a glance; a thin
          two-tone bar surfaces the Aven/Trades split when backend
          ships the breakdown. Below, the same merged events feed
          (capped at 12 most-recent) provides the deep-look context
          without making the founder scroll through two scroll-bound
          panels. */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Activity
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            <span className="text-foreground">{activity.total}</span> in 7d ·
            last 30d below
          </p>
        </header>

        {activity.hasBreakdown && stackSum > 0 && (
          <div className="mt-3">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-background">
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
            </div>
            <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-emerald" />
                Aven{" "}
                <span className="font-mono text-foreground">{aven7}</span>
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-1.5 rounded-full bg-sky-400" />
                Trades{" "}
                <span className="font-mono text-foreground">{trades7}</span>
              </li>
            </ul>
          </div>
        )}

        {recentTimeline.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No activity recorded in the last 30 days.
          </p>
        ) : (
          <>
            <ol className="mt-4 space-y-2 border-t border-border/40 pt-4">
              {recentTimeline.map((entry, idx) => (
                <EventRow key={`${entry.timestamp ?? idx}-${idx}`} entry={entry} />
              ))}
            </ol>
            {timelineTruncated && (
              <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground">
                Showing {TIMELINE_CAP} of {timeline.length} events · full log
                in the Activity tab
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function loginsAsEvents(history: LoginHistoryEntry[]): MemberEvent[] {
  return history.map((entry) => ({
    timestamp: entry.created_at ?? null,
    event_type: "login",
    description: `Signed in · ${uaLine(entry)}`,
    metadata: { ip_address: entry.ip_address },
  }));
}

function EventRow({ entry }: { entry: MemberEvent }) {
  const { Icon, classes } = iconForEvent(entry.event_type);
  const ts = entry.timestamp ?? entry.created_at;
  const ip =
    entry.metadata && typeof entry.metadata.ip_address === "string"
      ? (entry.metadata.ip_address as string)
      : null;
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <span
        aria-hidden
        className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full ${classes}`}
      >
        <Icon size={13} stroke={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {entry.description ?? entry.event_type ?? "Event"}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {timeAgo(ts)}
          {ip && <> · {ip}</>}
        </p>
      </div>
    </li>
  );
}

function iconForEvent(type: string | null | undefined): {
  Icon: React.ComponentType<{ size?: number; stroke?: number }>;
  classes: string;
} {
  const t = (type ?? "").toLowerCase();
  if (t === "login")
    return {
      Icon: IconLogin,
      classes: "bg-emerald/[0.10] text-emerald",
    };
  if (t.includes("trade"))
    return {
      Icon: IconChartCandle,
      classes: "bg-sky-400/[0.12] text-sky-300",
    };
  if (t.includes("aven") || t.includes("conversation"))
    return {
      Icon: IconMessage,
      classes: "bg-emerald/[0.10] text-emerald",
    };
  if (t.includes("brief"))
    return {
      Icon: IconClipboardCheck,
      classes: "bg-amber-500/[0.10] text-amber-300",
    };
  return {
    Icon: IconActivity,
    classes: "bg-surface text-muted-foreground",
  };
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
  // ReactNode so callers can colour individual hint fragments (P1
  // wants PnL emerald/red while the rest stays muted).
  hint?: React.ReactNode;
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
