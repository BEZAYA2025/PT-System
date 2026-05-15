"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconBellRinging } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { Toast, type ToastState } from "@/components/Toast";
import { SettingsCardHeader } from "./SettingsCardHeader";

// Round-15 notifications-polish: per-member delivery channel per
// notification class. Backend persists via POST
// /api/auth/notification-prefs; the GET on the same route lets us
// hydrate the toggles with whatever the member previously chose.

type Channel = "telegram" | "dashboard" | "both";
type PrefKey = "sl_alerts" | "setup_alerts" | "daily_brief";

interface Prefs {
  sl_alerts: Channel;
  setup_alerts: Channel;
  daily_brief: Channel;
}

const DEFAULT_PREFS: Prefs = {
  sl_alerts: "both",
  setup_alerts: "both",
  daily_brief: "telegram",
};

const ROWS: ReadonlyArray<{
  key: PrefKey;
  label: string;
  hint: string;
}> = [
  {
    key: "sl_alerts",
    label: "SL alerts",
    hint: "Heads-up when one of your open positions approaches stop-loss.",
  },
  {
    key: "setup_alerts",
    label: "Setup alerts",
    hint: "New setups Aven flags from Paul's methodology.",
  },
  {
    key: "daily_brief",
    label: "Daily brief",
    hint: "Pauls morning recap — what changed, what to watch.",
  },
];

const CHANNEL_OPTIONS: ReadonlyArray<{ value: Channel; label: string }> = [
  { value: "telegram", label: "Telegram" },
  { value: "dashboard", label: "Dashboard" },
  { value: "both", label: "Both" },
];

function normaliseChannel(v: unknown): Channel | null {
  if (v === "telegram" || v === "dashboard" || v === "both") return v;
  return null;
}

export function NotificationPrefsCard() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  // Suppress the auto-save effect during the initial hydration POST.
  const skipNextSave = useRef(false);

  // Hydrate from /api/auth/notification-prefs once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/proxy/auth/notification-prefs", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          // Backend may not have created the row yet — fall back to
          // defaults silently. Only surface the error UI on save.
          skipNextSave.current = true;
          setHydrated(true);
          return;
        }
        const data = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        const next: Prefs = {
          sl_alerts: normaliseChannel(data.sl_alerts) ?? DEFAULT_PREFS.sl_alerts,
          setup_alerts:
            normaliseChannel(data.setup_alerts) ?? DEFAULT_PREFS.setup_alerts,
          daily_brief:
            normaliseChannel(data.daily_brief) ?? DEFAULT_PREFS.daily_brief,
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

  // Persist on every change (after hydration). Defers via a small
  // debounce so rapid clicks coalesce into one POST.
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const id = setTimeout(() => void save(prefs), 350);
    return () => clearTimeout(id);
    // We only depend on prefs — the save closure reads the latest
    // value at fire time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, hydrated]);

  const save = useCallback(async (current: Prefs) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/notification-prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(current),
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
  }, []);

  const setChannel = (key: PrefKey, value: Channel) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Notifications · Preferences"
        title="Notification preferences"
        description="Where you want each kind of alert delivered. Changes save automatically."
        icon={<IconBellRinging size={18} stroke={1.75} aria-hidden />}
      />

      <div className="mt-6 divide-y divide-border">
        {ROWS.map((row) => (
          <div
            key={row.key}
            className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="min-w-0 sm:flex-1">
              <p className="text-sm font-medium text-foreground">{row.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{row.hint}</p>
            </div>
            <ChannelToggle
              value={prefs[row.key]}
              onChange={(v) => setChannel(row.key, v)}
              disabled={saving || !hydrated}
              name={row.key}
            />
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className={`${submitErrorClasses} mt-4`}>
          {error}
        </p>
      )}

      {/* The auto-save effect handles the round-trip — a manual button
          here would only exist to re-fire on error, so we just expose
          one inline when the auto-save failed. */}
      {error && (
        <button
          type="button"
          onClick={() => void save(prefs)}
          disabled={saving}
          className={`${buttonPrimaryClasses} mt-3`}
        >
          {saving ? "Retrying…" : "Retry save"}
        </button>
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Channel toggle — 3-option segmented control.
// ---------------------------------------------------------------------------

function ChannelToggle({
  value,
  onChange,
  disabled,
  name,
}: {
  value: Channel;
  onChange: (v: Channel) => void;
  disabled: boolean;
  name: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`${name} delivery channel`}
      className="inline-flex shrink-0 overflow-hidden rounded-full border border-border bg-surface p-0.5"
    >
      {CHANNEL_OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && onChange(opt.value)}
            disabled={disabled}
            className={[
              "rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors",
              active
                ? "bg-emerald text-background"
                : "text-muted-foreground hover:text-foreground",
              disabled ? "cursor-not-allowed opacity-60" : "",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
