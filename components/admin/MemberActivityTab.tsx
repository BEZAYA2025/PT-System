"use client";

import {
  IconBrandTelegram,
  IconChartCandle,
  IconCircleCheck,
  IconCircleX,
  IconLogin,
} from "@tabler/icons-react";
import type { LoginHistoryEntry, MemberDetail } from "@/lib/admin";

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

      {/* Sprint 3: Page-Views, Setup-Clicks, Brief-Open-History will
          land here once the tracking pipeline is live. Leaving the
          placeholder visible so the gap is honest rather than hidden. */}
      <section className="rounded-2xl border border-dashed border-border bg-surface/20 px-5 py-6">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Coming in Sprint 3:</strong>{" "}
          page views, setup-flow clicks, and brief open history land
          here once the tracking pipeline ships.
        </p>
      </section>
    </div>
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
