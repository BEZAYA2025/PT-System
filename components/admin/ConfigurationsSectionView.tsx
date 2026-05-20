"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconCurrencyDollar,
  IconFlag,
  IconLoader2,
  IconShieldLock,
  IconClock,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";

type TabKey = "pricing" | "trial" | "abuse" | "feature-flags";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "pricing", label: "Pricing" },
  { key: "trial", label: "Trial" },
  { key: "abuse", label: "Abuse Modes" },
  { key: "feature-flags", label: "Feature Flags" },
];

function isTabKey(v: string | null): v is TabKey {
  return (
    v === "pricing" || v === "trial" || v === "abuse" || v === "feature-flags"
  );
}

export function ConfigurationsSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "pricing";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "pricing") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/configurations${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Configurations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pricing display, trial duration, abuse-protection modes, and
          feature flags.
        </p>
      </header>

      <nav
        aria-label="Configurations tabs"
        className="overflow-x-auto sm:overflow-visible"
      >
        <ul className="flex min-w-max gap-1 sm:min-w-0">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex h-11 items-center px-3 text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
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
        {activeTab === "pricing" && <PricingTab />}
        {activeTab === "trial" && <TrialTab />}
        {activeTab === "abuse" && <AbuseModesTab />}
        {activeTab === "feature-flags" && <FeatureFlagsTab />}
      </section>
    </div>
  );
}

// Shared "Apply changes" confirm modal — every config tab uses the
// same dangerous-action treatment.
function ConfirmApplyModal({
  open,
  busy,
  onCancel,
  onApply,
  label,
}: {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onApply: () => void;
  label: string;
}) {
  return (
    <Modal
      open={open}
      onClose={() => !busy && onCancel()}
      title="Apply to production?"
      description={label}
      size="sm"
    >
      <div className="space-y-4 text-sm text-foreground">
        <p>
          This affects production members immediately. There&apos;s no
          undo — make sure the change is intended.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
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
            Apply now
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ----- Pricing (read-only Stripe mirror) ----------------------------

interface PricingPlan {
  tier?: string | null;
  interval?: "monthly" | "yearly" | string | null;
  unit_amount?: number | null;
  currency?: string | null;
  stripe_price_id?: string | null;
}

interface PricingPayload {
  plans?: PricingPlan[] | null;
  stripe_dashboard_url?: string | null;
}

function PricingTab() {
  const [data, setData] = useState<PricingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/config/pricing", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        setData((d ?? {}) as PricingPayload);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const plans = data?.plans ?? [];
  const dashboardUrl =
    data?.stripe_dashboard_url ?? "https://dashboard.stripe.com/products";

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5">
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconCurrencyDollar
            size={14}
            stroke={1.75}
            className="text-emerald"
            aria-hidden
          />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Pricing (read-only mirror)
          </h2>
        </div>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald hover:text-emerald-hover"
        >
          Edit in Stripe
          <IconArrowUpRight size={11} stroke={2} aria-hidden />
        </a>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">
        Stripe is the source of truth. This view reflects current
        live pricing only.
      </p>

      {loading ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading pricing…
        </p>
      ) : error ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : plans.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No pricing plans configured.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map((p, idx) => (
            <article
              key={p.stripe_price_id ?? idx}
              className="rounded-xl border border-border bg-background p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {(p.tier ?? "—").toString()} · {p.interval ?? "—"}
              </p>
              <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
                {p.unit_amount !== null && p.unit_amount !== undefined
                  ? `${(p.unit_amount / 100).toFixed(2)}${" "}${(p.currency ?? "usd").toUpperCase()}`
                  : "—"}
              </p>
              {p.stripe_price_id && (
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                  {p.stripe_price_id}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

// ----- Trial duration ----------------------------------------------

function TrialTab() {
  const [days, setDays] = useState<number>(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/config/trial-duration", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled) return;
        const raw =
          d && typeof d === "object"
            ? ((d as { days?: unknown; trial_duration_days?: unknown }).days ??
                (d as { trial_duration_days?: unknown }).trial_duration_days)
            : null;
        if (typeof raw === "number") setDays(raw);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/admin/config/trial-duration", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast({ message: `Trial duration set to ${days}d`, tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Save failed · ${err.message}` : "Save failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/40 p-5">
      <header className="flex items-center gap-2">
        <IconClock size={14} stroke={1.75} className="text-emerald" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Trial duration
        </h2>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">
        Number of free-trial days new members get. Affects all
        subsequent signups.
      </p>

      {loading ? (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading…
        </p>
      ) : (
        <div className="mt-4 flex items-end gap-3">
          <label className="block flex-1 max-w-[200px]">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Days (0–90)
            </span>
            <input
              type="number"
              min={0}
              max={90}
              value={days}
              onChange={(e) =>
                setDays(Math.max(0, Math.min(90, Number(e.target.value) || 0)))
              }
              disabled={busy}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
          >
            Save
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      <ConfirmApplyModal
        open={confirmOpen}
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onApply={save}
        label={`Trial duration → ${days} day${days === 1 ? "" : "s"}`}
      />
      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

// ----- Abuse modes (Layer 1–4) -------------------------------------

type AbuseMode = "log_only" | "enforce" | "disabled" | string;

interface AbuseLayer {
  layer?: number | null;
  name?: string | null;
  description?: string | null;
  mode?: AbuseMode | null;
}

const MODE_OPTIONS: AbuseMode[] = ["log_only", "enforce", "disabled"];

function AbuseModesTab() {
  const [layers, setLayers] = useState<AbuseLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ idx: number; mode: AbuseMode } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/config/abuse-modes", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as AbuseLayer[])
        : data && typeof data === "object"
          ? ((data as { layers?: AbuseLayer[] }).layers ?? [])
          : [];
      setLayers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const apply = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const target = layers[pending.idx];
      const layerKey = target.layer ?? pending.idx + 1;
      const res = await fetch("/api/proxy/admin/config/abuse-modes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layer: layerKey, mode: pending.mode }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setLayers((prev) =>
        prev.map((l, i) =>
          i === pending.idx ? { ...l, mode: pending.mode } : l,
        ),
      );
      setToast({
        message: `Layer ${layerKey} → ${pending.mode}`,
        tone: "success",
      });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Save failed · ${err.message}` : "Save failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <IconShieldLock
          size={14}
          stroke={1.75}
          className="text-emerald"
          aria-hidden
        />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Abuse modes
        </h2>
      </header>
      <p className="text-xs text-muted-foreground">
        Each protection layer can be in <code>log_only</code> (passive),{" "}
        <code>enforce</code> (block), or <code>disabled</code>. Switching
        to <code>enforce</code> may immediately block ongoing abuse
        patterns.
      </p>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading layers…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : layers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-8 text-center text-sm text-muted-foreground">
          No abuse layers configured.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {layers.map((l, idx) => (
            <article
              key={idx}
              className="rounded-xl border border-border bg-surface/40 p-4"
            >
              <header className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Layer {l.layer ?? idx + 1}
                  {l.name && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      · {l.name}
                    </span>
                  )}
                </p>
              </header>
              {l.description && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {l.description}
                </p>
              )}
              <select
                value={l.mode ?? "log_only"}
                onChange={(e) =>
                  setPending({ idx, mode: e.target.value as AbuseMode })
                }
                className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
              >
                {MODE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </article>
          ))}
        </div>
      )}

      <ConfirmApplyModal
        open={pending !== null}
        busy={busy}
        onCancel={() => setPending(null)}
        onApply={apply}
        label={
          pending
            ? `Layer ${layers[pending.idx]?.layer ?? pending.idx + 1} → ${pending.mode}`
            : ""
        }
      />
      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

// ----- Feature flags -----------------------------------------------

interface FeatureFlag {
  key: string;
  description?: string | null;
  enabled?: boolean | null;
}

function FeatureFlagsTab() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<FeatureFlag | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/config/feature-flags", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      let list: FeatureFlag[] = [];
      if (Array.isArray(data)) list = data as FeatureFlag[];
      else if (data && typeof data === "object") {
        const inner = (data as { flags?: FeatureFlag[] }).flags;
        if (Array.isArray(inner)) list = inner;
        else {
          // Sometimes returned as a {key: bool} map.
          list = Object.entries(data as Record<string, unknown>).map(
            ([key, value]) => ({
              key,
              enabled:
                typeof value === "boolean"
                  ? value
                  : (value as { enabled?: boolean })?.enabled ?? false,
              description:
                (value as { description?: string })?.description ?? null,
            }),
          );
        }
      }
      setFlags(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const apply = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/proxy/admin/config/feature-flags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: pending.key,
          enabled: pending.enabled,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFlags((prev) =>
        prev.map((f) =>
          f.key === pending.key ? { ...f, enabled: pending.enabled } : f,
        ),
      );
      setToast({
        message: `${pending.key} ${pending.enabled ? "ON" : "OFF"}`,
        tone: "success",
      });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Save failed · ${err.message}` : "Save failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <IconFlag size={14} stroke={1.75} className="text-emerald" aria-hidden />
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Feature flags
        </h2>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading flags…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : flags.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-8 text-center text-sm text-muted-foreground">
          No feature flags defined.
        </p>
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li
              key={f.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-mono text-sm text-foreground">{f.key}</p>
                {f.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.description}
                  </p>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(f.enabled)}
                  onChange={(e) =>
                    setPending({ ...f, enabled: e.target.checked })
                  }
                  className="size-4"
                />
                <span className="font-mono text-foreground">
                  {f.enabled ? "ON" : "OFF"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <ConfirmApplyModal
        open={pending !== null}
        busy={busy}
        onCancel={() => setPending(null)}
        onApply={apply}
        label={
          pending
            ? `${pending.key} → ${pending.enabled ? "ON" : "OFF"}`
            : ""
        }
      />
      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}
