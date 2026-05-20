"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertTriangle,
  IconBuildingBank,
  IconCheck,
  IconCircleDashed,
  IconInfoCircle,
  IconLink,
  IconUnlink,
} from "@tabler/icons-react";
import { Toast, type ToastState } from "@/components/Toast";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import type { CredentialStatus } from "@/lib/dal";
import {
  findExchange,
  formatExchangeLabel,
  type ExchangeId,
} from "@/lib/exchanges";
import { useImpersonation } from "@/lib/use-impersonation";
import { ConnectExchangeModal } from "./ConnectExchangeModal";
import { SettingsCardHeader } from "./SettingsCardHeader";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      // Round-16 hydration fix: anchor to UTC so server (Vercel UTC)
      // and client (any local TZ) format the same calendar date.
      timeZone: "UTC",
    });
  } catch {
    return iso;
  }
}

// Exchange label resolution moved to lib/exchanges.ts so the wizard and
// the settings card share the same registry. The local helper used to
// hand-roll the casing logic; now we just call formatExchangeLabel.

/**
 * Resolve the effective credential state from whatever the backend
 * actually returned. Preference order:
 *   1. `credential_status` (Polish-Trio 4-state) — source of truth.
 *   2. `has_exchange_connection` boolean — mid-migration backends.
 *   3. Legacy `binance_api_key_connected` boolean — pre-migration.
 *
 * Round-13b context: production hit a false-positive where the legacy
 * boolean said `true` despite no key in DB. This resolver makes the new
 * field load-bearing so the same drift can't show "Connected" again.
 */
function resolveStatus(props: {
  credentialStatus: CredentialStatus | undefined;
  hasExchangeConnection: boolean | undefined;
  legacyConnected: boolean;
}): CredentialStatus {
  if (props.credentialStatus) return props.credentialStatus;
  if (typeof props.hasExchangeConnection === "boolean") {
    return props.hasExchangeConnection ? "ok" : "missing";
  }
  return props.legacyConnected ? "ok" : "missing";
}

export function ExchangeSettingsCard({
  connected,
  addedAt,
  credentialStatus,
  exchangeType,
  hasExchangeConnection,
  invalidSince,
}: {
  /** Legacy boolean — kept for fallback. */
  connected: boolean;
  addedAt: string | null;
  credentialStatus?: CredentialStatus;
  exchangeType?: string | null;
  hasExchangeConnection?: boolean;
  invalidSince?: string | null;
}) {
  const router = useRouter();
  const { active: impersonating } = useImpersonation();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [highlight, setHighlight] = useState(false);

  const status = resolveStatus({
    credentialStatus,
    hasExchangeConnection,
    legacyConnected: connected,
  });
  const exchangeLabel = formatExchangeLabel(exchangeType);
  const currentExchangeId: ExchangeId | null = (() => {
    const def = findExchange(exchangeType ?? null);
    return def ? def.id : null;
  })();

  // Round-13c deep-link flow: landing at /dashboard/settings#exchange-api
  // (from the "Connect your exchange" empty-state on the dashboard) should
  // auto-open the wizard + flash a brief highlight so the member sees
  // exactly where to click. Only fires when there's no connected key —
  // for already-connected members the deep-link still scrolls them here
  // but doesn't ambush them with a modal.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#exchange-api") return;
    // Highlight pulses every time we land via the hash.
    setHighlight(true);
    const off = window.setTimeout(() => setHighlight(false), 2400);
    // Only auto-open the picker when the member isn't already connected.
    if (status === "missing") {
      const open = window.setTimeout(() => setModalOpen(true), 320);
      return () => {
        window.clearTimeout(off);
        window.clearTimeout(open);
      };
    }
    return () => window.clearTimeout(off);
    // status is derived from props — re-run when SSR-served props change.
  }, [status]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/api-key", {
        method: "DELETE",
      });
      const data = (await res
        .json()
        .catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        const backendMsg =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : null;
        setError(
          backendMsg
            ? `${backendMsg} (${res.status})`
            : `Couldn't remove the key — backend returned ${res.status}.`,
        );
        return;
      }
      setConfirming(false);
      setToast({
        message: "Exchange key removed.",
        tone: "success",
      });
      router.refresh();
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      <section
        id="exchange-api"
        ref={sectionRef}
        className={[
          cardClasses,
          "scroll-mt-24 transition-shadow duration-500",
          highlight
            ? "ring-2 ring-emerald/40 shadow-[0_0_48px_-12px_rgba(16,185,129,0.55)]"
            : "",
        ].join(" ")}
      >
        <SettingsCardHeader
          eyebrow="Exchange · API"
          title="Exchange API"
          description="Read-only key — Binance, Bybit, OKX, or any major exchange. Locked to our server via IP restriction."
          icon={<IconBuildingBank size={18} stroke={1.75} aria-hidden />}
          right={<StatusBadge status={status} exchangeLabel={exchangeLabel} />}
        />

        <StatusPanel
          status={status}
          exchangeLabel={exchangeLabel}
          addedAt={addedAt}
          invalidSince={invalidSince ?? null}
        />

        {error && (
          <p role="alert" className={`${submitErrorClasses} mt-4`}>
            {error}
          </p>
        )}

        {!confirming ? (
          <ActionRow
            status={status}
            onConnect={() => setModalOpen(true)}
            onRelink={() => setModalOpen(true)}
            onDisconnect={() => setConfirming(true)}
            disabled={impersonating}
          />
        ) : (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4">
            <p className="text-sm text-foreground">
              Disconnect your exchange? Trade-tracking pauses until you add a
              new key.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex h-12 items-center justify-center rounded-full bg-red-500 px-6 text-sm font-medium text-red-50 transition-colors hover:bg-red-400 disabled:opacity-60"
              >
                {disconnecting ? "Disconnecting…" : "Yes, disconnect"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className={buttonSecondaryClasses}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <ConnectExchangeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        isUpdate={status === "ok" || status === "invalid_please_relink"}
        currentExchangeId={currentExchangeId}
        onConnectSuccess={(label) =>
          setToast({
            message: `Connected to ${label}.`,
            tone: "success",
          })
        }
      />

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Status badge — small right-rail chip that summarises the 4-state at a
// glance. Colour matches state tone (emerald / muted / amber / sky).
// ---------------------------------------------------------------------------

function StatusBadge({
  status,
  exchangeLabel,
}: {
  status: CredentialStatus;
  exchangeLabel: string;
}) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald">
        <IconCheck size={11} stroke={2.25} aria-hidden />
        Connected · {exchangeLabel}
      </span>
    );
  }
  if (status === "invalid_please_relink") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-300">
        <IconAlertTriangle size={11} stroke={2.25} aria-hidden />
        Re-link needed
      </span>
    );
  }
  if (status === "founder_env") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/[0.08] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-sky-300">
        <IconInfoCircle size={11} stroke={2.25} aria-hidden />
        Founder · env
      </span>
    );
  }
  // missing
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
      <IconCircleDashed size={11} stroke={2} aria-hidden />
      Not connected
    </span>
  );
}

// ---------------------------------------------------------------------------
// Status panel — body content under the header. Same 4-state mapping
// but with full descriptions rather than the compact badge.
// ---------------------------------------------------------------------------

function StatusPanel({
  status,
  exchangeLabel,
  addedAt,
  invalidSince,
}: {
  status: CredentialStatus;
  exchangeLabel: string;
  addedAt: string | null;
  invalidSince: string | null;
}) {
  if (status === "ok") {
    return (
      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <Row label="Exchange" value={exchangeLabel} />
        <Row label="Connected" value={formatDate(addedAt)} />
      </dl>
    );
  }

  if (status === "invalid_please_relink") {
    return (
      <div className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/[0.04] p-4 text-sm">
        <p className="font-medium text-amber-200">
          Your key stopped validating
        </p>
        <p className="mt-1 text-amber-100/80">
          {exchangeLabel} returned an auth error
          {invalidSince ? ` since ${formatDate(invalidSince)}` : ""}. Most
          likely the key was rotated, IP-allowlist changed, or the read-only
          scope was revoked. Re-link to resume trade tracking.
        </p>
      </div>
    );
  }

  if (status === "founder_env") {
    return (
      <div className="mt-6 rounded-lg border border-sky-400/30 bg-sky-400/[0.04] p-4 text-sm">
        <p className="font-medium text-sky-200">Founder account</p>
        <p className="mt-1 text-sky-100/80">
          Your exchange credentials are loaded from the VPS environment, not
          the per-user keys table. Nothing to manage here — Connect/Disconnect
          is disabled for this account.
        </p>
      </div>
    );
  }

  // missing
  return (
    <dl className="mt-6 text-sm">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        Status
      </dt>
      <dd className="mt-1 font-mono text-foreground">Not connected</dd>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-mono text-foreground">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action row — buttons differ per state. founder_env shows no actions.
// ---------------------------------------------------------------------------

function ActionRow({
  status,
  onConnect,
  onRelink,
  onDisconnect,
  disabled = false,
}: {
  status: CredentialStatus;
  onConnect: () => void;
  disabled?: boolean;
  onRelink: () => void;
  onDisconnect: () => void;
}) {
  if (status === "founder_env") return null;

  if (status === "ok") {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConnect}
          disabled={disabled}
          title={disabled ? "Disabled during impersonation" : undefined}
          className={buttonSecondaryClasses}
        >
          Update key
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={disabled}
          title={disabled ? "Disabled during impersonation" : undefined}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-red-500/40 bg-red-500/[0.06] px-6 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-60"
        >
          <IconUnlink size={15} stroke={1.75} aria-hidden />
          Disconnect
        </button>
      </div>
    );
  }

  if (status === "invalid_please_relink") {
    return (
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRelink}
          disabled={disabled}
          title={disabled ? "Disabled during impersonation" : undefined}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-amber-400 px-6 text-sm font-medium text-amber-950 transition-colors hover:bg-amber-300 disabled:opacity-60"
        >
          <IconLink size={15} stroke={1.75} aria-hidden />
          Re-link exchange
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          disabled={disabled}
          title={disabled ? "Disabled during impersonation" : undefined}
          className={buttonSecondaryClasses}
        >
          Remove instead
        </button>
      </div>
    );
  }

  // missing
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={onConnect}
        disabled={disabled}
        title={disabled ? "Disabled during impersonation" : undefined}
        className={buttonSecondaryClasses}
      >
        Connect exchange
      </button>
    </div>
  );
}
