import "server-only";

import { cookies } from "next/headers";
import type { CurrentUser } from "./dal";
import type { SetupStep } from "@/components/dashboard/SetupProgressCard";

const DISMISS_COOKIE = "setup_dismissed_at";

export function computeSetupSteps(user: CurrentUser): SetupStep[] {
  const subscriptionActive =
    user.subscription_status === "active" ||
    user.subscription_status === "trialing";

  return [
    {
      kind: "account",
      label: "Account created",
      complete: true,
      actionable: false,
    },
    {
      kind: "email",
      label: "Email verified",
      complete: true,
      actionable: false,
    },
    {
      kind: "subscription",
      label: "Subscription active",
      helper: subscriptionActive
        ? undefined
        : "Open billing portal from Settings to fix.",
      complete: subscriptionActive,
      actionable: false,
    },
    {
      kind: "telegram",
      label: "Connect Telegram",
      helper: "So Aven can send briefings and alerts.",
      complete: user.telegram_username !== null,
      actionable: true,
    },
    {
      kind: "exchange",
      label: "Connect your exchange",
      helper: "Read-only API key — Binance, Bybit, or OKX.",
      complete: user.binance_api_key_connected,
      actionable: true,
    },
  ];
}

export async function readSetupDismissed(): Promise<boolean> {
  const store = await cookies();
  return store.has(DISMISS_COOKIE);
}

export function setupAllComplete(steps: SetupStep[]): boolean {
  return steps.every((s) => s.complete);
}
