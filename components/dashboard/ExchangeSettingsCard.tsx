"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { ConnectExchangeModal } from "./ConnectExchangeModal";

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
      const res = await fetch("/api/proxy/auth/remove-binance-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Couldn’t remove the key — please try again.",
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
      <section className={cardClasses}>
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Exchange API
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only key — Binance, Bybit, OKX, or any major exchange. Locked to our server via IP
          restriction.
        </p>

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
