"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconBrandTelegram } from "@tabler/icons-react";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { Toast, type ToastState } from "@/components/Toast";
import { ConnectTelegramModal } from "./ConnectTelegramModal";
import { SettingsCardHeader } from "./SettingsCardHeader";

export function TelegramSettingsCard({
  telegramUsername,
}: {
  telegramUsername: string | null;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const connected = telegramUsername !== null;

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/unlink-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Couldn’t disconnect — please try again.",
        );
        return;
      }
      setConfirming(false);
      setToast({ message: "Telegram disconnected.", tone: "success" });
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
        <SettingsCardHeader
          eyebrow="Notifications · Telegram"
          title="Telegram"
          description="Aven sends briefings, alerts, and trade-monitor pings here."
          icon={<IconBrandTelegram size={18} stroke={1.75} aria-hidden />}
        />

        <dl className="mt-6 text-sm">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Connected account
          </dt>
          <dd className="mt-1 font-mono text-foreground">
            {connected ? `@${telegramUsername}` : "Not linked"}
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
              {connected ? "Re-link Telegram" : "Connect Telegram"}
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
              Disconnect Telegram? Aven will stop sending you messages until
              you link a new account.
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

      <ConnectTelegramModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        isRelink={connected}
      />

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
