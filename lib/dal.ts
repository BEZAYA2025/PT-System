import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendFetch } from "./backend";

export type Tier = "standard" | "vip";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | null;

export interface CurrentUser {
  id: string;
  email: string;
  tier: Tier;
  telegram_username: string | null;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  binance_api_key_connected: boolean;
  binance_api_key_added_at: string | null;
  aven_quota_used: number;
  aven_quota_limit: number | null;
}

export const getAccessToken = cache(async (): Promise<string | null> => {
  const store = await cookies();
  return store.get("access_token")?.value ?? null;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<{ user: CurrentUser }>("/api/auth/me", {
    method: "GET",
    token,
  });
  if (!res.ok) return null;
  return res.data?.user ?? null;
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export interface PublicTrade {
  id: string;
  symbol: string;
  side: "long" | "short";
  entry: number;
  exit: number | null;
  roi: number | null;
  status: "open" | "closed";
  closed_at: string | null;
  opened_at: string;
}

export interface MemberTrade extends PublicTrade {
  user_id: string;
}

export interface AvenBriefing {
  id: string;
  created_at: string;
  body: string;
  voice_url: string | null;
}

export interface AlertEntry {
  id: string;
  kind: "setup" | "trade_monitor" | "methodology";
  message: string;
  created_at: string;
}

export interface DashboardSnapshot {
  public_trades: PublicTrade[];
  open_trades: MemberTrade[];
  latest_briefing: AvenBriefing | null;
  recent_alerts: AlertEntry[];
}

export const getDashboardSnapshot = cache(
  async (): Promise<DashboardSnapshot | null> => {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await backendFetch<DashboardSnapshot>(
      "/api/cockpit/snapshot",
      { method: "GET", token },
    );
    if (!res.ok) return null;
    return res.data;
  },
);

// Loose-typed snapshot fetch for callers that read fields beyond the
// strictly-typed DashboardSnapshot (e.g. the live TopStrip metrics, whose
// backend shape is still being finalized).
export const getRawSnapshot = cache(
  async (): Promise<Record<string, unknown> | null> => {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await backendFetch<Record<string, unknown>>(
      "/api/cockpit/snapshot",
      { method: "GET", token },
    );
    if (!res.ok) return null;
    return res.data;
  },
);
