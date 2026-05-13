"use client";

import { useState } from "react";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";

const DEFAULT_TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ??
  "https://t.me/paultradingsystem_bot";

export function TelegramLinkSection({
  telegramUsername,
}: {
  telegramUsername: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const handleRelink = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/auth/generate-telegram-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
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
      setError("Connection issue. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={cardClasses}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Telegram
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Aven sends briefings, alerts, and trade-monitor messages here.
      </p>

      <dl className="mt-6 text-sm">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">
          Connected account
        </dt>
        <dd className="mt-1 font-mono text-foreground">
          {telegramUsername ? `@${telegramUsername}` : "Not linked"}
        </dd>
      </dl>

      {error && (
        <p role="alert" className={`${submitErrorClasses} mt-4`}>
          {error}
        </p>
      )}

      {linkUrl ? (
        <div className="mt-6 space-y-3 rounded-lg border border-emerald/30 bg-emerald/[0.04] p-4">
          <p className="text-sm text-foreground">
            New link generated — open Telegram to confirm.
          </p>
          <a
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonSecondaryClasses}
          >
            Open Telegram bot
          </a>
        </div>
      ) : (
        <div className="mt-6">
          <button
            type="button"
            onClick={handleRelink}
            disabled={pending}
            className={buttonSecondaryClasses}
          >
            {pending
              ? "Generating link…"
              : telegramUsername
                ? "Re-link Telegram"
                : "Link Telegram"}
          </button>
        </div>
      )}
    </section>
  );
}
