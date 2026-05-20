"use client";

import { useEffect, useRef, useState } from "react";
import { IconBellRinging, IconDeviceDesktop } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { Toast, type ToastState } from "@/components/Toast";
import { useImpersonation } from "@/lib/use-impersonation";
import { SettingsCardHeader } from "./SettingsCardHeader";

// Round-26 notifications-rewrite: one row per notification class, with
// a fixed "Dashboard · always on" info pill and a Telegram on/off
// switch. Backend persists via POST /api/auth/notification-prefs — the
// existing payload uses a per-pref channel value ("dashboard" or
// "both"), so we map Telegram-on → "both" and Telegram-off →
// "dashboard". That keeps the contract unchanged while the UI moves
// to the simpler per-channel toggle.

type Channel = "telegram" | "dashboard" | "both";
type PrefKey =
  | "daily_brief"
  | "trade_alerts"
  | "paul_activity"
  | "setup_alerts";

interface Prefs {
  daily_brief: Channel;
  trade_alerts: Channel;
  paul_activity: Channel;
  setup_alerts: Channel;
}

// Every channel defaults to "both" — Telegram-on out of the box.
// Members opt-out per row if they want fewer pings.
const DEFAULT_PREFS: Prefs = {
  daily_brief: "both",
  trade_alerts: "both",
  paul_activity: "both",
  setup_alerts: "both",
};

interface Row {
  key: PrefKey;
  title: string;
  description: string;
  hint?: string;
}

const ROWS: ReadonlyArray<Row> = [
  {
    key: "daily_brief",
    title: "Daily Morning Briefing",
    description:
      "Get notified when Aven publishes today's brief in your dashboard.",
    hint: "We send a short Telegram nudge — the full briefing opens in your dashboard for the best reading experience.",
  },
  {
    key: "trade_alerts",
    title: "Trade Alerts",
    description:
      "Setup triggers, position changes, SL/TP hits on your trades.",
  },
  {
    key: "paul_activity",
    title: "Paul's Trade Activity",
    description: "When Paul opens or closes a trade you're following.",
  },
  {
    key: "setup_alerts",
    title: "Setup Scanner Hits",
    description:
      "When a high-confluence setup is detected by Aven's system.",
  },
];

function normaliseChannel(v: unknown): Channel | null {
  if (v === "telegram" || v === "dashboard" || v === "both") return v;
  return null;
}

// Channel <→ Telegram-on conversion. Dashboard is always on; only the
// Telegram leg can be toggled. "telegram"-only (no dashboard) isn't a
// supported state in the new UI but we still accept it on hydration
// for back-compat with members whose row was saved before this round.
function telegramOnFromChannel(c: Channel): boolean {
  return c === "telegram" || c === "both";
}
function channelFromTelegramOn(on: boolean): Channel {
  return on ? "both" : "dashboard";
}

export function NotificationPrefsCard() {
  const { active: impersonating } = useImpersonation();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const skipNextSave = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/proxy/auth/notification-prefs", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          skipNextSave.current = true;
          setHydrated(true);
          return;
        }
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const next: Prefs = {
          daily_brief:
            normaliseChannel(data.daily_brief) ?? DEFAULT_PREFS.daily_brief,
          trade_alerts:
            normaliseChannel(data.trade_alerts) ??
            normaliseChannel(data.sl_alerts) ??
            DEFAULT_PREFS.trade_alerts,
          paul_activity:
            normaliseChannel(data.paul_activity) ??
            DEFAULT_PREFS.paul_activity,
          setup_alerts:
            normaliseChannel(data.setup_alerts) ?? DEFAULT_PREFS.setup_alerts,
        };
        skipNextSave.current = true;
        setPrefs(next);
        setHydrated(true);
      } catch {
        if (cancelled) return;
        skipNextSave.current = true;
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (current: Prefs) => {
    setSaving(true);
    setError(null);
    try {
      // Round-26 back-compat: ship both the new `trade_alerts` key and
      // the legacy `sl_alerts` mirror so a backend that hasn't picked
      // up the rename yet keeps persisting the same toggle.
      const payload = {
        ...current,
        sl_alerts: current.trade_alerts,
      };
      const res = await fetch("/api/proxy/auth/notification-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        const msg =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : null;
        setError(
          msg
            ? `${msg} (${res.status})`
            : `Couldn't save (${res.status}).`,
        );
        return;
      }
      setToast({
        message: "Notification preferences saved.",
        tone: "success",
      });
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const id = setTimeout(() => void save(prefs), 350);
    return () => clearTimeout(id);
  }, [prefs, hydrated]);

  const setTelegram = (key: PrefKey, on: boolean) => {
    setPrefs((p) => ({ ...p, [key]: channelFromTelegramOn(on) }));
  };

  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Notifications · Preferences"
        title="Notification preferences"
        description="Dashboard always shows everything. Toggle Telegram per category. Changes save automatically."
        icon={<IconBellRinging size={18} stroke={1.75} aria-hidden />}
      />

      <div className="mt-6 divide-y divide-border">
        {ROWS.map((row) => (
          <NotificationRow
            key={row.key}
            row={row}
            telegramOn={telegramOnFromChannel(prefs[row.key])}
            disabled={saving || !hydrated || impersonating}
            onToggle={(on) => setTelegram(row.key, on)}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className={`${submitErrorClasses} mt-4`}>
          {error}
        </p>
      )}

      {error && (
        <button
          type="button"
          onClick={() => void save(prefs)}
          disabled={saving || impersonating}
          title={impersonating ? "Disabled during impersonation" : undefined}
          className={`${buttonPrimaryClasses} mt-3`}
        >
          {saving ? "Retrying…" : "Retry save"}
        </button>
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

function NotificationRow({
  row,
  telegramOn,
  disabled,
  onToggle,
}: {
  row: Row;
  telegramOn: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-6">
      <div className="min-w-0 sm:flex-1">
        <p className="text-sm font-medium text-foreground">{row.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {row.description}
        </p>
        {row.hint && (
          <p className="mt-1.5 text-[11px] italic leading-relaxed text-muted-foreground/80">
            {row.hint}
          </p>
        )}
      </div>

      {/* Channel controls. Mobile: spread between left and right edge so
          the row stays visually balanced under the description. Desktop:
          natural width on the right of the title block (sm:shrink-0). */}
      <div className="flex items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
        <DashboardChip />
        <TelegramSwitch
          on={telegramOn}
          disabled={disabled}
          onChange={onToggle}
          name={row.key}
        />
      </div>
    </div>
  );
}

function DashboardChip() {
  // Trimmed to icon + label only. The "always on" semantic lives in
  // the section header's description ("Dashboard always shows
  // everything"); repeating it on every row was load-bearing for
  // earlier copy but now just eats horizontal budget on mobile.
  return (
    <span
      title="Dashboard always shows every notification"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald/20 bg-emerald/[0.05] px-2.5 py-1"
    >
      <IconDeviceDesktop
        size={11}
        stroke={1.75}
        className="text-emerald/85"
        aria-hidden
      />
      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-emerald/85">
        Dashboard
      </span>
    </span>
  );
}

function TelegramSwitch({
  on,
  disabled,
  onChange,
  name,
}: {
  on: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <label
      className={`inline-flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Telegram
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Telegram notifications for ${name}`}
        onClick={() => !disabled && onChange(!on)}
        disabled={disabled}
        className={[
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          on ? "bg-emerald" : "bg-border",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        <span
          className={[
            "inline-block size-4 rounded-full bg-background shadow-sm transition-transform",
            on ? "translate-x-[18px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </label>
  );
}
