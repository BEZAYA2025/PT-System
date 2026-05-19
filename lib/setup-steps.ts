import "server-only";

import { cookies } from "next/headers";
import type { CurrentUser } from "./dal";
import type { SetupStep } from "@/components/dashboard/SetupProgressCard";

const DISMISS_COOKIE = "setup_dismissed_at";

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      // Anchor to UTC so SSR (Vercel UTC) and CSR agree on the date.
      timeZone: "UTC",
    });
  } catch {
    return null;
  }
}

function subscriptionHelper(user: CurrentUser): string | undefined {
  const date = formatDate(user.subscription_period_end);
  if (user.subscription_status === "trialing") {
    return date ? `Trial · 14 days · ends ${date}` : "Trial · 14 days";
  }
  if (user.subscription_status === "active") {
    return date ? `Renews ${date}` : undefined;
  }
  if (
    user.subscription_status === "past_due" ||
    user.subscription_status === "incomplete" ||
    user.subscription_status === "unpaid"
  ) {
    return "Open billing portal from Settings to fix.";
  }
  return undefined;
}

export function computeSetupSteps(user: CurrentUser): SetupStep[] {
  const subscriptionActive =
    user.subscription_status === "active" ||
    user.subscription_status === "trialing";

  return [
    {
      kind: "account",
      label: "Create your account",
      helper: "Done",
      complete: true,
      actionable: false,
    },
    {
      kind: "email",
      label: "Verify your email",
      helper: "Done",
      complete: true,
      actionable: false,
    },
    {
      kind: "subscription",
      label: "Subscription active",
      helper: subscriptionHelper(user),
      complete: subscriptionActive,
      actionable: false,
    },
    {
      kind: "telegram",
      label: "Connect Telegram",
      helper: "Get live alerts and chat with Aven on your phone.",
      complete: user.telegram_username !== null,
      actionable: true,
    },
    {
      kind: "exchange",
      label: "Connect your exchange",
      helper: "Read-only API key — your funds stay safe on your exchange.",
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
