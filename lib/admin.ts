import "server-only";

import { backendFetch } from "./backend";
import { getAccessToken } from "./dal";

// Small helpers around /api/admin/* endpoints. Each function returns
// either the typed shape on success or null on failure so the caller
// (an async server component) can render an error tile without a
// throw. Endpoint shapes follow ADMIN_API_SPEC.md — when fields the
// backend may name differently land in the same conceptual slot we
// read defensively (e.g. `members.length` OR `total`) so older /
// newer deploys both render something useful.

export interface AdminMembersListEntry {
  id: string;
  email: string;
  display_name: string | null;
  tier: "standard" | "vip" | null;
  status:
    | "active"
    | "trialing"
    | "trial"
    | "canceled"
    | "cancelled"
    | "suspended"
    | "past_due"
    | "incomplete"
    | null;
  joined_at?: string | null;
  created_at?: string | null;
  trial_end?: string | null;
  trial_ends_at?: string | null;
  binance_api_key_connected?: boolean;
  telegram_connected?: boolean;
  has_exchange_connection?: boolean;
  // Sprint 2 additions — all optional so legacy backend deploys still
  // render rows. Missing values surface as "—" / muted tone, never null
  // crashes in the table.
  engagement_score?: number | null;
  aven_messages_count_7d?: number | null;
  trades_count_7d?: number | null;
  brief_views_count_7d?: number | null;
  lifetime_value_usd?: number | null;
  last_active_at?: string | null;
  /** Sprint 2 alias for has_exchange_connection — the spec uses
   *  this shorter name; we accept either to stay compatible. */
  exchange_connected?: boolean;
  tags?: string[] | null;
}

export interface AdminMembersResponse {
  members: AdminMembersListEntry[];
  total?: number;
}

export async function fetchAdminMembers(): Promise<AdminMembersResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>("/api/admin/members", {
    method: "GET",
    token,
  });
  if (!res.ok) return null;
  const data = res.data as Record<string, unknown> | unknown[];
  if (Array.isArray(data)) {
    return { members: data as AdminMembersListEntry[], total: data.length };
  }
  if (data && typeof data === "object") {
    const members = Array.isArray(
      (data as { members?: unknown }).members,
    )
      ? ((data as { members: AdminMembersListEntry[] }).members)
      : [];
    const total =
      typeof (data as { total?: unknown }).total === "number"
        ? (data as { total: number }).total
        : members.length;
    return { members, total };
  }
  return { members: [], total: 0 };
}

export interface MrrMetrics {
  current: number;
  previous?: number | null;
  delta_pct?: number | null;
}

export async function fetchAdminMrr(): Promise<MrrMetrics | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>("/api/admin/metrics/mrr", {
    method: "GET",
    token,
  });
  if (!res.ok) return null;
  const d = (res.data ?? {}) as Record<string, unknown>;
  const current =
    typeof d.current === "number"
      ? d.current
      : typeof d.mrr === "number"
        ? (d.mrr as number)
        : typeof d.amount === "number"
          ? (d.amount as number)
          : 0;
  const previous =
    typeof d.previous === "number"
      ? d.previous
      : typeof d.previous_mrr === "number"
        ? (d.previous_mrr as number)
        : null;
  const delta_pct =
    typeof d.delta_pct === "number"
      ? d.delta_pct
      : typeof d.change_pct === "number"
        ? (d.change_pct as number)
        : null;
  return { current, previous, delta_pct };
}

export interface PendingBriefing {
  id: string;
  date?: string | null;
  generated_at?: string | null;
  created_at?: string | null;
  kind?: "morning" | "midday" | "evening" | string | null;
  asset?: string | null;
  symbol?: string | null;
  body?: string | null;
  content?: string | null;
  author?: string | null;
}

export interface PendingBriefingsResponse {
  briefings: PendingBriefing[];
}

export async function fetchAdminPendingBriefings(): Promise<PendingBriefingsResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>("/api/admin/briefings/pending", {
    method: "GET",
    token,
  });
  if (!res.ok) return null;
  const d = res.data as unknown;
  if (Array.isArray(d)) return { briefings: d as PendingBriefing[] };
  if (d && typeof d === "object") {
    const list = (d as { briefings?: unknown }).briefings;
    if (Array.isArray(list)) return { briefings: list as PendingBriefing[] };
    const pending = (d as { pending?: unknown }).pending;
    if (Array.isArray(pending)) return { briefings: pending as PendingBriefing[] };
  }
  return { briefings: [] };
}

export type SystemHealthTone = "ok" | "degraded" | "down";

export interface SystemService {
  name: string;
  status: "healthy" | "degraded" | "down" | "unhealthy" | string;
}

export interface SystemHealthResponse {
  services: SystemService[];
  overall: SystemHealthTone;
}

export async function fetchAdminSystemHealth(): Promise<SystemHealthResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>("/api/admin/system/services", {
    method: "GET",
    token,
  });
  if (!res.ok) return null;
  const d = res.data as unknown;
  let services: SystemService[] = [];
  if (Array.isArray(d)) services = d as SystemService[];
  else if (d && typeof d === "object") {
    const arr = (d as { services?: unknown }).services;
    if (Array.isArray(arr)) services = arr as SystemService[];
  }
  // Derive a single overall tone — down beats degraded beats ok.
  let overall: SystemHealthTone = "ok";
  for (const s of services) {
    const status = (s.status ?? "").toLowerCase();
    if (status === "down" || status === "unhealthy") {
      overall = "down";
      break;
    }
    if (status === "degraded") overall = "degraded";
  }
  return { services, overall };
}

export interface MemberNote {
  id: string;
  content: string;
  created_at?: string | null;
  updated_at?: string | null;
  author_id?: string | null;
}

export interface MemberDetail extends AdminMembersListEntry {
  // ADMIN_API_SPEC.md §13: detail response is the list entry shape
  // plus these audit / engagement / notes fields. All optional —
  // older backend deploys silently degrade rather than 500ing.
  notes?: MemberNote[] | null;
  total_trades?: number | null;
  win_rate?: number | null;
  total_pnl?: number | null;
  aven_messages?: number | null;
  aven_conversations?: number | null;
  total_aven_messages?: number | null;
  total_conversations?: number | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  billing_interval?: "monthly" | "yearly" | null;
  exchange_type?: string | null;
  signed_up_at?: string | null;
  last_login_at?: string | null;
  subscription_period_end?: string | null;
  current_period_end?: string | null;
  telegram_username?: string | null;
  binance_api_key_added_at?: string | null;
  payment_method?: {
    brand?: string | null;
    last_4?: string | number | null;
    last4?: string | number | null;
    exp_month?: number | null;
    exp_year?: number | null;
    updated_at?: string | null;
  } | null;
}

export async function fetchAdminMemberDetail(
  id: string,
): Promise<MemberDetail | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>(
    `/api/admin/members/${encodeURIComponent(id)}`,
    { method: "GET", token },
  );
  if (!res.ok) return null;
  const d = res.data as unknown;
  if (!d || typeof d !== "object") return null;
  const inner =
    (d as { member?: MemberDetail }).member ??
    (d as MemberDetail);
  return inner ?? null;
}

export interface LoginHistoryEntry {
  id: string;
  created_at?: string | null;
  ip_address?: string | null;
  user_agent_parsed?: {
    browser?: string | null;
    os?: string | null;
    device?: string | null;
  } | null;
  user_agent?: string | null;
}

export async function fetchAdminMemberLoginHistory(
  id: string,
  options: { days?: number; limit?: number } = {},
): Promise<LoginHistoryEntry[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const qs = new URLSearchParams();
  if (options.days) qs.set("days", String(options.days));
  if (options.limit) qs.set("limit", String(options.limit));
  const path = `/api/admin/members/${encodeURIComponent(id)}/login-history${qs.toString() ? `?${qs}` : ""}`;
  const res = await backendFetch<unknown>(path, { method: "GET", token });
  if (!res.ok) return null;
  const d = res.data as unknown;
  if (Array.isArray(d)) return d as LoginHistoryEntry[];
  if (d && typeof d === "object") {
    const arr = (d as { history?: unknown; entries?: unknown }).history
      ?? (d as { entries?: unknown }).entries;
    if (Array.isArray(arr)) return arr as LoginHistoryEntry[];
  }
  return [];
}

export interface MemberInvoice {
  id: string;
  date?: string | null;
  created?: string | null;
  amount_usd?: number | null;
  amount?: number | null;
  status?: string | null;
  hosted_url?: string | null;
  hosted_invoice_url?: string | null;
  pdf_url?: string | null;
  invoice_pdf?: string | null;
}

export interface ImpersonationSession {
  id: string;
  admin_id?: string | null;
  target_member_id?: string | null;
  target_member_email?: string | null;
  target_member_name?: string | null;
  started_at?: string | null;
  expires_at?: string | null;
  ended_at?: string | null;
  reason?: string | null;
}

export async function fetchAdminImpersonationSessions(): Promise<
  ImpersonationSession[] | null
> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>(
    "/api/admin/impersonation-sessions",
    { method: "GET", token },
  );
  if (!res.ok) return null;
  const d = res.data as unknown;
  if (Array.isArray(d)) return d as ImpersonationSession[];
  if (d && typeof d === "object") {
    const arr =
      (d as { sessions?: unknown }).sessions ??
      (d as { items?: unknown }).items;
    if (Array.isArray(arr)) return arr as ImpersonationSession[];
  }
  return [];
}

export interface MemberTradeStats {
  total_count?: number | null;
  win_rate?: number | null;
  avg_r_multiple?: number | null;
  total_pnl_usd?: number | null;
  best_trade?: {
    symbol?: string | null;
    pnl_usd?: number | null;
    roi_pct?: number | null;
  } | null;
  worst_trade?: {
    symbol?: string | null;
    pnl_usd?: number | null;
    roi_pct?: number | null;
  } | null;
  open_count?: number | null;
  last_30d?: number | null;
}

export interface MemberTrade {
  id: string;
  symbol?: string | null;
  side?: "long" | "short" | string | null;
  leverage?: number | null;
  entry?: number | null;
  exit?: number | null;
  mark_price?: number | null;
  // Backend §13.14 uses `sl` / `tp`; older payloads kept `_price`.
  // Accept both so the column reads from whichever the response carries.
  sl?: number | null;
  tp?: number | null;
  sl_price?: number | null;
  tp_price?: number | null;
  pnl_usd?: number | null;
  pnl_pct?: number | null;
  /** Margin-ROI (leverage-aware) — preferred field after the
   *  backend ROI fix. `roi_pct` is kept as a fallback for any
   *  cached / pre-fix responses. */
  margin_roi_pct?: number | null;
  roi_pct?: number | null;
  status?: "open" | "closed" | string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  duration?: number | string | null;
  duration_seconds?: number | null;
  exit_reason?: string | null;
  score?: number | null;
}

export interface MemberTradesPage {
  items: MemberTrade[];
  page?: number | null;
  pages?: number | null;
  total?: number | null;
}

export interface MemberEvent {
  // The events feed merges login / trade / aven / brief signals. Each
  // entry carries a type string the renderer dispatches on plus a
  // free-form metadata blob for type-specific detail.
  timestamp?: string | null;
  created_at?: string | null;
  event_type?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

// AvenMessage + parseAvenMessages live in lib/admin-helpers.ts so
// client components can import them without pulling this whole
// server-only module into the browser bundle. Re-exported here for
// server-side callers that want both in a single import.
export { parseAvenMessages, type AvenMessage } from "./admin-helpers";

export interface AvenConversationSummary {
  id: string;
  member_id?: string | null;
  member_email?: string | null;
  member_name?: string | null;
  started_at?: string | null;
  message_count?: number | null;
  snippet?: string | null;
  first_user_message?: string | null;
}

export interface MemberAuditLogEntry {
  timestamp?: string | null;
  created_at?: string | null;
  action_type?: string | null;
  description?: string | null;
  actor?: string | null;
  details?: Record<string, unknown> | null;
}

export async function fetchAdminMemberEvents(
  id: string,
  options: { days?: number; event_type?: string } = {},
): Promise<MemberEvent[] | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const qs = new URLSearchParams();
  if (options.days) qs.set("days", String(options.days));
  if (options.event_type) qs.set("event_type", options.event_type);
  const path = `/api/admin/members/${encodeURIComponent(id)}/events${qs.toString() ? `?${qs}` : ""}`;
  const res = await backendFetch<unknown>(path, { method: "GET", token });
  if (!res.ok) return null;
  const d = res.data as unknown;
  if (Array.isArray(d)) return d as MemberEvent[];
  if (d && typeof d === "object") {
    const arr = (d as { events?: unknown }).events;
    if (Array.isArray(arr)) return arr as MemberEvent[];
  }
  return [];
}

export interface DiscountCode {
  id: string;
  code: string;
  /** Percentage (1-100) when discount_type === "percent", else absolute USD. */
  discount_value?: number | null;
  discount_type?: "percent" | "fixed" | string | null;
  /** "once" | "forever" | "repeating" (with `duration_in_months` set). */
  duration?: "once" | "forever" | "repeating" | string | null;
  duration_in_months?: number | null;
  uses?: number | null;
  redemptions?: number | null;
  max_uses?: number | null;
  max_redemptions?: number | null;
  status?: "active" | "disabled" | string | null;
  active?: boolean;
  created_at?: string | null;
  expires_at?: string | null;
}

export interface DiscountCodesResponse {
  codes: DiscountCode[];
}

export async function fetchAdminDiscountCodes(): Promise<DiscountCodesResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const res = await backendFetch<unknown>("/api/admin/discount-codes", {
    method: "GET",
    token,
  });
  if (!res.ok) return null;
  const d = res.data as unknown;
  if (Array.isArray(d)) return { codes: d as DiscountCode[] };
  if (d && typeof d === "object") {
    const list =
      (d as { codes?: unknown }).codes ??
      (d as { discount_codes?: unknown }).discount_codes;
    if (Array.isArray(list)) return { codes: list as DiscountCode[] };
  }
  return { codes: [] };
}
