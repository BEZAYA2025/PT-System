import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { backendFetch } from "./backend";
import {
  shapeHistoryResponse,
  type ChatMessage,
  type HistoryResponse,
} from "./aven";
import {
  shapeNotificationsResponse,
  type NotificationsResponse,
} from "./notifications";

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
  /** Backend always returns the field (post onboarding-refactor merge);
   *  may be null when the member hasn't set one. */
  display_name: string | null;
  tier: Tier;
  telegram_username: string | null;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  /** Backend field stays named binance_* for historical reasons but the UI
   *  treats this as a generic exchange-API connection (Binance/Bybit/OKX). */
  binance_api_key_connected: boolean;
  binance_api_key_added_at: string | null;
  aven_quota_used: number;
  aven_quota_limit: number | null;
  /** True once the welcome flow has been dismissed. Defaults undefined when
   *  the backend doesn't yet expose this field — UI treats undefined as
   *  "no welcome shown" for safety. */
  first_login_completed?: boolean;
  /** ISO timestamp of the previous dashboard visit. Used to drive the
   *  daily-greeting injection. */
  last_dashboard_visit_at?: string | null;
}

export const getAccessToken = cache(async (): Promise<string | null> => {
  const store = await cookies();
  return store.get("access_token")?.value ?? null;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<{ user: CurrentUser & Record<string, unknown> }>(
    "/api/auth/me",
    { method: "GET", token },
  );
  if (!res.ok || !res.data?.user) return null;

  const user = res.data.user;

  // Defensive: backend route version may expose period_end under different
  // names. Alias whatever's present so the SubscriptionCard always has a
  // value to format.
  if (!user.subscription_period_end) {
    const raw = user as Record<string, unknown>;
    const candidates = [
      raw.period_end,
      raw.current_period_end,
      raw.next_billing_at,
      raw.billing_period_end,
      raw.next_billing_date,
    ];
    for (const v of candidates) {
      if (typeof v === "string" && v.length > 0) {
        user.subscription_period_end = v;
        break;
      }
      if (typeof v === "number" && Number.isFinite(v)) {
        // Unix seconds OR ms → normalised to ISO so SubscriptionCard
        // formatDate works uniformly.
        const ms = v > 1e12 ? v : v * 1000;
        user.subscription_period_end = new Date(ms).toISOString();
        break;
      }
    }
  }

  return user;
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

/** Initial Paul's-trades feed for SSR seed. The endpoint already strips
 *  USD PnL server-side (privacy contract enforced backend-side). */
export const getInitialPaulTrades = cache(
  async (): Promise<unknown | null> => {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await backendFetch<unknown>("/api/cockpit/paul-trades", {
      method: "GET",
      token,
    });
    if (!res.ok) return null;
    return res.data;
  },
);

/** Initial member-owned trades feed for SSR seed. Returns the raw payload
 *  (includes has_exchange + exchange_type meta) so shapeMyTrades can build
 *  the empty-state copy without an extra fetch. */
export const getInitialMyTrades = cache(
  async (): Promise<unknown | null> => {
    const token = await getAccessToken();
    if (!token) return null;
    const res = await backendFetch<unknown>("/api/cockpit/my-trades", {
      method: "GET",
      token,
    });
    if (!res.ok) return null;
    return res.data;
  },
);

/** Initial Aven chat history for fast first paint. Returns the shaped
 *  messages plus the cursor info so the client knows whether to show the
 *  "Load older" pill. Empty list / hasMore=false on backend failure. */
export const getInitialAvenHistory = cache(
  async (limit = 50): Promise<HistoryResponse> => {
    const token = await getAccessToken();
    if (!token) {
      return { messages: [], hasMore: false, nextBeforeId: null, nextSinceId: null };
    }
    const res = await backendFetch<unknown>(
      `/api/aven/history?limit=${limit}`,
      { method: "GET", token },
    );
    if (!res.ok) {
      return { messages: [], hasMore: false, nextBeforeId: null, nextSinceId: null };
    }
    return shapeHistoryResponse(res.data);
  },
);

// Re-export ChatMessage to keep existing import sites compiling.
export type { ChatMessage };

/** Initial notifications for the bell — gives an instant unread count on
 *  first paint instead of a flicker from 0. Returns an empty bag if the
 *  backend is unreachable. */
export const getInitialNotifications = cache(
  async (limit = 50): Promise<NotificationsResponse> => {
    const token = await getAccessToken();
    if (!token) {
      return { notifications: [], unreadCount: 0, totalCount: 0 };
    }
    const res = await backendFetch<unknown>(
      `/api/notifications?limit=${limit}`,
      { method: "GET", token },
    );
    if (!res.ok) {
      return { notifications: [], unreadCount: 0, totalCount: 0 };
    }
    return shapeNotificationsResponse(res.data);
  },
);
