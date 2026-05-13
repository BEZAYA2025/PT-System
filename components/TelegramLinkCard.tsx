"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import { buttonPrimaryClasses, buttonSecondaryClasses } from "@/lib/ui";

const DEFAULT_TELEGRAM_URL =
  process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ??
  "https://t.me/paultradingsystem_bot";

export function TelegramLinkCard({
  telegramLinkUrl,
  tier,
}: {
  telegramLinkUrl?: string;
  tier: string;
}) {
  const router = useRouter();
  const url = telegramLinkUrl ?? DEFAULT_TELEGRAM_URL;

  return (
    <div className="rounded-2xl border border-emerald/30 bg-emerald/[0.04] p-8 sm:p-10">
      <div className="flex flex-col items-center text-center">
        <CircleCheck
          aria-hidden="true"
          strokeWidth={1.5}
          className="size-14 text-emerald"
        />
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Account ready
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          One last step — link your Telegram so Aven can reach you.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald">
          {tier} tier · activated
        </p>
      </div>

      <div className="mt-8 space-y-3">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${buttonPrimaryClasses} w-full`}
        >
          Open Telegram bot
        </a>

        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className={`${buttonSecondaryClasses} w-full`}
        >
          Continue to dashboard
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        After the bot confirms,{" "}
        <Link
          href="/dashboard"
          className="text-foreground underline-offset-2 hover:underline"
        >
          your cockpit will reflect the link
        </Link>
        .
      </p>
    </div>
  );
}
