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
