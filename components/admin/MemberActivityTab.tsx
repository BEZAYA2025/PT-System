"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconActivity,
  IconAlertCircle,
  IconBrandTelegram,
  IconChartCandle,
  IconCircleCheck,
  IconCircleX,
  IconLoader2,
  IconLogin,
} from "@tabler/icons-react";
import type {
  LoginHistoryEntry,
  MemberDetail,
  MemberEvent,
} from "@/lib/admin";
import { bucketByDay, formatDayHeader } from "@/lib/admin-format";

interface Props {
  member: MemberDetail;
  loginHistory: LoginHistoryEntry[];
}

function formatDate(iso: string | null | undefined): string {
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

function uaLine(entry: LoginHistoryEntry): string {
  const parsed = entry.user_agent_parsed;
  if (parsed) {
    const browser = parsed.browser ?? "";
    const os = parsed.os ?? "";
    const device = parsed.device ?? "";
    const parts = [browser, os, device].filter(Boolean);
    if (parts.length > 0) {
      return browser && os ? `${browser} on ${os}` : parts.join(" · ");
    }
  }
  if (entry.user_agent) return entry.user_agent;
  return "Unknown device";
}

function deviceLabel(entry: LoginHistoryEntry): string {
  return entry.user_agent_parsed?.device ?? "Desktop";
}

export function MemberActivityTab({ member, loginHistory }: Props) {
  const exchangeConnected = Boolean(
    member.exchange_connected ??
      member.has_exchange_connection ??
      member.binance_api_key_connected,
  );

  // In-app activity events (page_view / brief_read / setup_click /
  // etc.) come from the events feed filtered to event_type=activity.
  // Lazy-loaded after first paint so the tab opens instantly even on
  // members with a deep event history.
  const [events, setEvents] = useState<MemberEvent[] | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const eventsByDay = useMemo(
    () =>
      bucketByDay(
        (events ?? []).slice(0, 50),
        (e) => e.timestamp ?? e.created_at,
      ),
    [events],
  );

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/events?event_type=activity&days=30`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as MemberEvent[])
          : data && typeof data === "object"
            ? ((data as { events?: MemberEvent[] }).events ?? [])
            : [];
        setEvents(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setEventsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Login history · last 30 days
          </h2>
        </header>
        {loginHistory.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No logins recorded in the last 30 days.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border/60 bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">IP</th>
                  <th className="px-3 py-2 font-medium">Browser · OS</th>
                  <th className="px-3 py-2 font-medium">Device</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {entry.ip_address ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <IconLogin size={12} stroke={1.75} aria-hidden />
                        {uaLine(entry)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {deviceLabel(entry)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Connections
          </h2>
        </header>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ConnectionRow
            icon={IconBrandTelegram}
            label="Telegram"
            connected={Boolean(member.telegram_connected)}
            detail={
              member.telegram_username
                ? `@${member.telegram_username}`
                : null
            }
          />
          <ConnectionRow
            icon={IconChartCandle}
            label="Exchange"
            connected={exchangeConnected}
            detail={
              exchangeConnected
                ? `${member.exchange_type ?? "Connected"}${
                    member.binance_api_key_added_at
                      ? ` · since ${formatDate(member.binance_api_key_added_at)}`
                      : ""
                  }`
                : null
            }
          />
        </dl>
      </section>

      {/* In-app activity events — page_view / brief_read / setup_click /
          etc. Fed by the tracker library which fires from the dashboard
          chrome and key cards. */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            In-app activity · last 30 days
          </h2>
          {events && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {events.length} event{events.length === 1 ? "" : "s"}
            </p>
          )}
        </header>
        {eventsLoading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading events…
          </p>
        ) : eventsError ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load events · {eventsError}
          </p>
        ) : !events || events.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No in-app events captured in the last 30 days.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {eventsByDay.map(([day, dayEvents]) => (
              <div key={day}>
                <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {formatDayHeader(day)}
                  <span className="ml-2 text-muted-foreground/70">
                    · {dayEvents.length}
                  </span>
                </h3>
                <ol className="space-y-2">
                  {dayEvents.map((e, idx) => (
                    <ActivityEventRow
                      key={`${e.timestamp ?? idx}-${idx}`}
                      event={e}
                    />
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ActivityEventRow({ event }: { event: MemberEvent }) {
  const ts = event.timestamp ?? event.created_at;
  const path =
    event.metadata && typeof event.metadata.path === "string"
      ? (event.metadata.path as string)
      : null;
  const step =
    event.metadata && typeof event.metadata.step === "string"
      ? (event.metadata.step as string)
      : null;
  const briefId =
    event.metadata && typeof event.metadata.briefing_generated_at === "string"
      ? (event.metadata.briefing_generated_at as string)
      : null;
  const subtitle = path ?? step ?? briefId ?? null;
  return (
    <li className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5">
      <span
        aria-hidden
        className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald/[0.10] text-emerald"
      >
        <IconActivity size={13} stroke={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {event.description ?? event.event_type ?? "Event"}
          {event.event_type && !event.description && (
            <span className="ml-1 font-mono text-[11px] text-muted-foreground">
              · {event.event_type}
            </span>
          )}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {formatDate(ts)}
          {subtitle && <> · {subtitle}</>}
        </p>
      </div>
    </li>
  );
}

function ConnectionRow({
  icon: Icon,
  label,
  connected,
  detail,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
  connected: boolean;
  detail: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3">
      <span
        aria-hidden
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md ${
          connected
            ? "bg-emerald/[0.10] text-emerald"
            : "bg-surface text-muted-foreground"
        }`}
      >
        <Icon size={16} stroke={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {label}
          {connected ? (
            <IconCircleCheck
              size={12}
              stroke={2}
              className="text-emerald"
              aria-hidden
            />
          ) : (
            <IconCircleX
              size={12}
              stroke={2}
              className="text-muted-foreground"
              aria-hidden
            />
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {connected ? (detail ?? "Connected") : "Not connected"}
        </p>
      </div>
    </div>
  );
}
