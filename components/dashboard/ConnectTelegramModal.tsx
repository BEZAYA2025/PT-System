"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck, Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { QRCodeDisplay } from "@/components/QRCodeDisplay";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  submitErrorClasses,
} from "@/lib/ui";

const POLL_INTERVAL_MS = 5000;

const DEFAULT_TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ??
  "https://t.me/paultradingsystem_bot";

interface MeResponse {
  user?: {
    telegram_username?: string | null;
  };
}

export function ConnectTelegramModal({
  open,
  onClose,
  isRelink = false,
}: {
  open: boolean;
  onClose: () => void;
  isRelink?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const checkLinked = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/proxy/auth/me", { method: "GET" });
      if (!res.ok) return false;
      const data = (await res.json().catch(() => ({}))) as MeResponse;
      return Boolean(data?.user?.telegram_username);
    } catch {
      return false;
    }
  }, []);

  const onSuccess = useCallback(() => {
    stopPolling();
    setSuccess(true);
    // Refresh server components so SetupProgressCard re-evaluates linked state.
    router.refresh();
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1800);
  }, [onClose, router, stopPolling]);

  // Generate link + start polling whenever the modal opens.
  useEffect(() => {
    if (!open) {
      stopPolling();
      setLinkUrl(null);
      setError(null);
      setSuccess(false);
      return;
    }

    let cancelled = false;
    setGenerating(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/proxy/auth/generate-telegram-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError(
            typeof data?.message === "string"
              ? data.message
              : "Could not generate link.",
          );
          return;
        }
        const url =
          typeof data?.telegram_link_url === "string"
            ? data.telegram_link_url
            : DEFAULT_TELEGRAM_URL;
        setLinkUrl(url);
      } catch {
        if (!cancelled) setError("Connection issue. Please try again.");
      } finally {
        if (!cancelled) setGenerating(false);
      }
    })();

    pollRef.current = setInterval(async () => {
      const linked = await checkLinked();
      if (linked) onSuccess();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [open, checkLinked, onSuccess, stopPolling]);

  const handleManualCheck = async () => {
    setChecking(true);
    const linked = await checkLinked();
    setChecking(false);
    if (linked) {
      onSuccess();
    } else {
      setError(
        "Not detected yet — open Telegram, tap the bot, then come back.",
      );
    }
  };

  const title = isRelink ? "Re-link Telegram" : "Connect Telegram";
  const description = isRelink
    ? "Generate a fresh deep-link to replace the current Telegram connection."
    : "Aven uses Telegram for briefings, alerts, and trade-monitor messages.";

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      {success ? (
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3 py-8 text-center"
        >
          <CircleCheck
            aria-hidden
            strokeWidth={1.5}
            className="size-14 text-emerald"
          />
          <p className="text-base font-medium text-foreground">
            Telegram linked
          </p>
          <p className="text-sm text-muted-foreground">
            Aven can reach you now.
          </p>
        </motion.div>
      ) : generating ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Loader2
            aria-hidden
            className="size-6 animate-spin text-muted-foreground"
          />
          <p className="text-sm text-muted-foreground">Generating link…</p>
        </div>
      ) : (
        <div className="space-y-5">
          {linkUrl && (
            <QRCodeDisplay
              value={linkUrl}
              caption="Scan with your phone's camera, then approve in Telegram."
            />
          )}

          <div className="flex flex-col gap-3">
            {linkUrl && (
              <a
                href={linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonPrimaryClasses} w-full`}
              >
                Open Telegram on this device
              </a>
            )}
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={checking}
              className={`${buttonSecondaryClasses} w-full`}
            >
              {checking ? "Checking…" : "I’ve linked it"}
            </button>
          </div>

          {error && (
            <p role="alert" className={submitErrorClasses}>
              {error}
            </p>
          )}

          <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            Auto-detects every 5 seconds
          </p>
        </div>
      )}
    </Modal>
  );
}
