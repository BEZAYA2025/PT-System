"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { ConnectExchangeModal } from "./ConnectExchangeModal";
import { SettingsCardHeader } from "./SettingsCardHeader";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ExchangeSettingsCard({
  connected,
  addedAt,
}: {
  connected: boolean;
  addedAt: string | null;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      // Round-10 fix: backend went exchange-agnostic — REST DELETE on
      // /api/auth/api-key replaces the legacy POST /remove-binance-key.
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
        // Surface the status code so production-test failures are
        // diagnosable without opening the network tab.
        setError(
          backendMsg
            ? `${backendMsg} (${res.status})`
            : `Couldn't remove the key — backend returned ${res.status}.`,
        );
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <>
      {/* scroll-mt offset accounts for the sticky DashboardHeader so
          deep-links (e.g. /dashboard/settings#exchange-api from the
          empty-state on the dashboard) don't land underneath it. */}
      <section
        id="exchange-api"
        className={`${cardClasses} scroll-mt-24`}
      >
        <SettingsCardHeader
          eyebrow="Exchange · API"
          title="Exchange API"
          description="Read-only key — Binance, Bybit, OKX, or any major exchange. Locked to our server via IP restriction."
        />

        <dl className="mt-6 text-sm">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </dt>
          <dd className="mt-1 font-mono text-foreground">
            {connected
              ? `Connected (added ${formatDate(addedAt)})`
              : "Not connected"}
          </dd>
        </dl>

        {error && (
          <p role="alert" className={`${submitErrorClasses} mt-4`}>
            {error}
          </p>
        )}

        {!confirming ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className={buttonSecondaryClasses}
            >
              {connected ? "Update key" : "Connect exchange"}
            </button>
            {connected && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex h-12 items-center justify-center rounded-full border border-red-500/40 bg-red-500/[0.06] px-6 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
              >
                Disconnect
              </button>
            )}
          </div>
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
        isUpdate={connected}
      />
    </>
  );
}
