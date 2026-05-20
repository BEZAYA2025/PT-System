"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconCircleCheck,
  IconCircleDot,
  IconClipboardCheck,
  IconExclamationCircle,
  IconLockSquare,
  IconUserPlus,
  IconUsers,
} from "@tabler/icons-react";
import type {
  AdminFunnelPayload,
  AdminMembersListEntry,
  AdminSignupsPayload,
  ImpersonationSession,
  MrrMetrics,
  SystemHealthResponse,
} from "@/lib/admin";
import { formatNumber, formatPct, formatUSD } from "@/lib/admin-format";

interface Props {
  displayName: string;
  members: AdminMembersListEntry[] | null;
  mrr: MrrMetrics | null;
  signups: AdminSignupsPayload | null;
  funnel: AdminFunnelPayload | null;
  pendingBriefingsCount: number | null;
  systemHealth: SystemHealthResponse | null;
  impersonationSessions: ImpersonationSession[];
  criticalDriftCount: number;
}

function formatToday(now = new Date()): string {
  return now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function withinDays(iso: string | null | undefined, days: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < days * 24 * 60 * 60 * 1000;
}

function withinHours(iso: string | null | undefined, hours: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < hours * 60 * 60 * 1000;
}

function isPaid(member: AdminMembersListEntry): boolean {
  const s = (member.status ?? "").toLowerCase();
  return s === "active" || s === "past_due";
}

function exchangeConnected(m: AdminMembersListEntry): boolean {
  return Boolean(
    m.exchange_connected ??
      m.has_exchange_connection ??
      m.binance_api_key_connected,
  );
}

function isImpersonationActive(s: ImpersonationSession): boolean {
  if (s.ended_at) return false;
  if (s.expires_at) {
    const t = Date.parse(s.expires_at);
    if (Number.isFinite(t) && t <= Date.now()) return false;
  }
  return true;
}

// Bucket signups into per-day counts over a rolling N-day window
// (most-recent-day last). Used for the sparkline under "New Members".
function signupsByDay(
  members: AdminMembersListEntry[],
  days: number,
): number[] {
  const buckets = new Array<number>(days).fill(0);
  const dayMs = 24 * 60 * 60 * 1000;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const baseT = todayStart.getTime() - (days - 1) * dayMs;
  for (const m of members) {
    const raw = m.joined_at ?? m.created_at;
    if (!raw) continue;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) continue;
    const idx = Math.floor((t - baseT) / dayMs);
    if (idx >= 0 && idx < days) buckets[idx] += 1;
  }
  return buckets;
}

type NewMembersWindow = "today" | "7d" | "30d";
type ActiveMembersWindow = "24h" | "7d" | "30d";
type TierFilter = "all" | "standard" | "vip";

const NEW_WINDOWS: ReadonlyArray<{ key: NewMembersWindow; label: string; days: number }> = [
  { key: "today", label: "Today", days: 1 },
  { key: "7d", label: "7d", days: 7 },
  { key: "30d", label: "30d", days: 30 },
];

const ACTIVE_WINDOWS: ReadonlyArray<{
  key: ActiveMembersWindow;
  label: string;
  hours: number;
}> = [
  { key: "24h", label: "24h", hours: 24 },
  { key: "7d", label: "7d", hours: 24 * 7 },
  { key: "30d", label: "30d", hours: 24 * 30 },
];

const TIER_FILTERS: ReadonlyArray<{ key: TierFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "standard", label: "Std" },
  { key: "vip", label: "VIP" },
];

export function OverviewView({
  displayName,
  members,
  mrr,
  signups,
  funnel,
  pendingBriefingsCount,
  systemHealth,
  impersonationSessions,
  criticalDriftCount,
}: Props) {
  const [newWindow, setNewWindow] = useState<NewMembersWindow>("today");
  const [newTier, setNewTier] = useState<TierFilter>("all");
  const [activeWindow, setActiveWindow] = useState<ActiveMembersWindow>("24h");

  const list = members ?? [];

  const newCount = useMemo(() => {
    const w = NEW_WINDOWS.find((x) => x.key === newWindow)!;
    return list
      .filter(
        (m) => newTier === "all" || (m.tier ?? "standard") === newTier,
      )
      .filter((m) => withinDays(m.joined_at ?? m.created_at, w.days)).length;
  }, [list, newWindow, newTier]);

  const activeCount = useMemo(() => {
    const w = ACTIVE_WINDOWS.find((x) => x.key === activeWindow)!;
    return list.filter((m) => withinHours(m.last_active_at, w.hours)).length;
  }, [list, activeWindow]);

  const sparkline = useMemo(() => signupsByDay(list, 30), [list]);

  // Adoption rates — denominator is paid members (active subscriptions).
  const adoption = useMemo(() => {
    const paid = list.filter(isPaid);
    const denom = paid.length;
    const exchange = paid.filter(exchangeConnected).length;
    const telegram = paid.filter((m) => Boolean(m.telegram_connected)).length;
    const both = paid.filter(
      (m) => exchangeConnected(m) && Boolean(m.telegram_connected),
    ).length;
    const partial = paid.filter(
      (m) =>
        (exchangeConnected(m) ? 1 : 0) + (m.telegram_connected ? 1 : 0) === 1,
    ).length;
    const none = denom - (both + partial);
    // Per-exchange breakdown (top 3 by count).
    const counts = new Map<string, number>();
    for (const m of paid) {
      if (!exchangeConnected(m)) continue;
      const k = (m.exchange_type ?? "other").toLowerCase();
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const byExchange = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    return {
      denom,
      exchange,
      telegram,
      both,
      partial,
      none,
      byExchange,
    };
  }, [list]);

  const trialConversion = useMemo(() => {
    // Prefer backend's `conversion_rate` when present; fall back to
    // trials_converted / trials_started if it exposes those.
    if (!funnel) return null;
    if (typeof funnel.conversion_rate === "number") {
      return {
        rate: funnel.conversion_rate,
        converted: funnel.trials_converted ?? null,
        started: funnel.trials_started ?? null,
      };
    }
    const converted = funnel.trials_converted ?? null;
    const started = funnel.trials_started ?? null;
    if (
      typeof converted === "number" &&
      typeof started === "number" &&
      started > 0
    ) {
      return { rate: converted / started, converted, started };
    }
    return null;
  }, [funnel]);

  const activeImps = impersonationSessions.filter(isImpersonationActive);

  // System health label + tone for the status strip.
  const healthOverall = systemHealth?.overall ?? "ok";
  const healthTone =
    healthOverall === "down"
      ? "danger"
      : healthOverall === "degraded"
        ? "warning"
        : "success";

  const todayBriefingLabel =
    pendingBriefingsCount === null
      ? "—"
      : pendingBriefingsCount > 0
        ? `${pendingBriefingsCount} pending review`
        : "All caught up";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {displayName}
        </h1>
        <p
          className="mt-1 text-sm text-muted-foreground"
          suppressHydrationWarning
        >
          {formatToday()}
        </p>
      </header>

      {/* ROW 1 — Membership */}
      <section aria-label="Membership">
        <SectionHeader
          title="Membership"
          subtitle={
            list.length > 0
              ? `${formatNumber(list.length)} total members`
              : undefined
          }
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* New Members */}
          <KpiCard
            href="/admin/members?filter=recent"
            icon={IconUserPlus}
            label="New members"
            value={formatNumber(newCount)}
            toggle={
              <div className="space-y-1">
                <TogglePills
                  options={NEW_WINDOWS}
                  value={newWindow}
                  onChange={setNewWindow}
                />
                <TogglePills
                  options={TIER_FILTERS}
                  value={newTier}
                  onChange={setNewTier}
                />
              </div>
            }
            footer={<Sparkline values={sparkline} />}
          />

          {/* Active Members */}
          <KpiCard
            href="/admin/members?filter=active"
            icon={IconUsers}
            label="Active members"
            value={formatNumber(activeCount)}
            hint="Login, Aven message, or trade in window"
            toggle={
              <TogglePills
                options={ACTIVE_WINDOWS}
                value={activeWindow}
                onChange={setActiveWindow}
              />
            }
          />

          {/* MRR */}
          <KpiCard
            href="/admin/business?tab=revenue"
            icon={IconArrowRight}
            label="MRR"
            value={mrr ? formatUSD(mrr.current ?? 0) : "—"}
            hint={
              mrr && typeof mrr.delta_pct === "number"
                ? `${mrr.delta_pct >= 0 ? "↑" : "↓"} ${Math.abs(mrr.delta_pct).toFixed(1)}% vs last month`
                : undefined
            }
            tone={
              mrr && typeof mrr.delta_pct === "number"
                ? mrr.delta_pct >= 0
                  ? "emerald"
                  : "red"
                : undefined
            }
            prominent
          />

          {/* Trial → Paid */}
          <KpiCard
            href="/admin/business?tab=funnel"
            icon={IconArrowRight}
            label="Trial → paid"
            value={trialConversion ? formatPct(trialConversion.rate) : "—"}
            hint={
              trialConversion &&
              trialConversion.converted !== null &&
              trialConversion.started !== null
                ? `${formatNumber(trialConversion.converted)} of ${formatNumber(trialConversion.started)} trials converted`
                : funnel === null
                  ? "Funnel data unavailable"
                  : "No trials yet"
            }
          />
        </div>
      </section>

      {/* ROW 2 — Connection Adoption */}
      <section aria-label="Connection adoption">
        <SectionHeader
          title="Connection adoption"
          subtitle={
            adoption.denom > 0
              ? `${adoption.denom.toLocaleString()} paid members`
              : "Awaiting paid member data"
          }
        />
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <AdoptionCard
            href="/admin/members?filter=exchange_connected"
            label="Exchange API"
            count={adoption.exchange}
            denom={adoption.denom}
            sub={
              adoption.byExchange.length > 0
                ? adoption.byExchange
                    .map(
                      ([name, n]) =>
                        `${name.charAt(0).toUpperCase()}${name.slice(1)}: ${n}`,
                    )
                    .join(" · ")
                : null
            }
          />
          <AdoptionCard
            href="/admin/members?filter=telegram_connected"
            label="Telegram"
            count={adoption.telegram}
            denom={adoption.denom}
          />
          <AdoptionCard
            href="/admin/members?filter=fully_set_up"
            label="Fully set up"
            count={adoption.both}
            denom={adoption.denom}
            sub={
              adoption.denom > 0
                ? `${formatPct((adoption.partial / adoption.denom) * 100)} partial · ${formatPct((adoption.none / adoption.denom) * 100)} no setup`
                : null
            }
          />
        </div>
      </section>

      {/* ROW 3 — Status strip */}
      <section aria-label="Status strip">
        <SectionHeader title="Status" />
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusChip
            href="/admin/briefings"
            label="Today's briefing"
            value={todayBriefingLabel}
            tone={
              pendingBriefingsCount && pendingBriefingsCount > 0
                ? "warning"
                : "neutral"
            }
            icon={IconClipboardCheck}
          />
          <StatusChip
            href="/admin/system"
            label="System"
            value={
              healthOverall === "down"
                ? "🔴 Issues"
                : healthOverall === "degraded"
                  ? "🟡 Watch"
                  : "🟢 Green"
            }
            tone={healthTone === "success" ? "neutral" : healthTone}
          />
          {activeImps.length > 0 && (
            <StatusChip
              href="/admin/impersonation-sessions"
              label="Impersonations"
              value={`${activeImps.length} active`}
              tone="warning"
              icon={IconLockSquare}
            />
          )}
          {criticalDriftCount > 0 && (
            <StatusChip
              href="/admin/aven?tab=drift&severity=critical"
              label="Critical drift today"
              value={`${criticalDriftCount} flagged`}
              tone="danger"
              icon={IconExclamationCircle}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="font-mono text-[11px] text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  hint,
  toggle,
  footer,
  tone,
  prominent,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  value: string;
  hint?: string;
  toggle?: React.ReactNode;
  footer?: React.ReactNode;
  tone?: "emerald" | "red";
  prominent?: boolean;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald"
      : tone === "red"
        ? "text-red-300"
        : "text-foreground";
  const valueClass = prominent
    ? "text-center text-4xl sm:text-5xl font-semibold tracking-tight"
    : "text-3xl font-semibold tracking-tight";
  const hintClass = prominent
    ? "text-center text-xs text-muted-foreground"
    : "text-xs text-muted-foreground";
  return (
    <Link
      href={href}
      className="group flex h-full flex-col justify-between rounded-xl border border-border bg-surface/50 p-4 transition-colors hover:border-emerald/40"
    >
      <header className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className="text-muted-foreground">
          <Icon size={14} stroke={1.75} />
        </span>
      </header>
      <div
        className={
          prominent
            ? "flex flex-1 flex-col items-center justify-center gap-1.5 py-2"
            : "mt-3 flex flex-col gap-1"
        }
      >
        <p className={`${valueClass} ${toneClass}`}>{value}</p>
        {hint && <p className={hintClass}>{hint}</p>}
      </div>
      {toggle && (
        <div className="mt-3" onClick={(e) => e.preventDefault()}>
          {toggle}
        </div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </Link>
  );
}

function TogglePills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={(e) => {
            // Defensive: the parent <Link> would otherwise eat the
            // click and navigate. Stop propagation so the toggle
            // changes state cleanly.
            e.preventDefault();
            e.stopPropagation();
            onChange(key);
          }}
          aria-pressed={value === key}
          className={[
            "inline-flex h-6 items-center rounded-full border px-2 text-[10px] font-medium",
            value === key
              ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <div
      className="flex h-6 items-end gap-[1px]"
      aria-label={`${values.length}-day sparkline`}
    >
      {values.map((v, i) => (
        <span
          key={i}
          className="block flex-1 rounded-sm bg-emerald/40"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function AdoptionCard({
  href,
  label,
  count,
  denom,
  sub,
}: {
  href: string;
  label: string;
  count: number;
  denom: number;
  sub?: string | null;
}) {
  const pct = denom > 0 ? (count / denom) * 100 : null;
  return (
    <Link
      href={href}
      className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-surface/50 p-4 transition-colors hover:border-emerald/40"
    >
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {formatNumber(count)}
        {pct !== null && (
          <span className="ml-2 font-mono text-sm text-emerald">
            ({pct.toFixed(0)}%)
          </span>
        )}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      )}
    </Link>
  );
}

function StatusChip({
  href,
  label,
  value,
  tone = "neutral",
  icon: Icon,
}: {
  href: string;
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger";
  icon?: React.ComponentType<{ size?: number; stroke?: number }>;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-400/40 bg-red-500/[0.06] text-red-300 hover:bg-red-500/[0.10]"
      : tone === "warning"
        ? "border-amber-500/40 bg-amber-500/[0.06] text-amber-200 hover:bg-amber-500/[0.10]"
        : "border-border bg-surface text-foreground hover:border-emerald/40";
  const DotIcon = (() => {
    if (Icon) return Icon;
    if (tone === "warning") return IconCircleDot;
    if (tone === "danger") return IconExclamationCircle;
    return IconCircleCheck;
  })();
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${toneClass}`}
    >
      <DotIcon size={12} stroke={1.75} aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </span>
      <span>{value}</span>
    </Link>
  );
}
