// Pure browser-safe helpers for admin surfaces. Lives outside
// lib/admin.ts so client components can import these without
// pulling in the server-only fetch helpers (and the server-only
// shim chain that goes with them — `import "server-only"` in
// lib/admin.ts → lib/backend.ts / lib/dal.ts).

export interface AvenMessageMeta {
  quality_score?: number | null;
  qualityScore?: number | null;
  sentiment?: "positive" | "neutral" | "negative" | string | null;
}

export interface AvenMessage {
  role?: "user" | "aven" | "assistant" | string | null;
  content?: string | null;
  timestamp?: string | null;
  ts?: string | null;
  created_at?: string | null;
  meta?: AvenMessageMeta | null;
}

// Safely lowercase ANY backend-shaped value without throwing. The
// `(x ?? "").toLowerCase()` pattern that's idiomatic across the admin
// surfaces explodes when the backend ships a non-string under a field
// the FE expected to be a string — e.g. status as a number, role as
// an object {label: "..."}. `(5 ?? "")` evaluates to `5`, not "",
// so `.toLowerCase()` on a number throws TypeError mid-render and
// the entire tab lands in the admin error boundary.
//
// safeLower() is the bulletproof replacement: coerces non-string
// values via String() before lowercasing, so anything renders without
// crashing. Null / undefined collapse to "" as before.
export function safeLower(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).toLowerCase();
}

// Resolved tier across the member shapes. Founder is a virtual tier
// (backend stores is_founder bool alongside the tier column). Helps
// us render the badge with a single source of truth wherever member
// rows / detail panes show it.
export type ResolvedTier = "founder" | "vip" | "standard";

export function resolveTier(m: {
  is_founder?: boolean | null;
  tier?: string | null;
}): ResolvedTier {
  if (m.is_founder) return "founder";
  return safeLower(m.tier) === "vip" ? "vip" : "standard";
}

export function tierBadgeLabel(t: ResolvedTier): string {
  if (t === "founder") return "FOUNDER";
  if (t === "vip") return "VIP";
  return "STANDARD";
}

export function tierBadgeClass(t: ResolvedTier): string {
  // Founder gets an amber/gold treatment so it reads as distinct
  // from VIP's emerald — same hierarchy the dashboard's user pill
  // uses for founder accounts.
  if (t === "founder")
    return "border-amber-400/40 bg-amber-400/[0.10] text-amber-200";
  if (t === "vip")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  return "border-border bg-surface text-muted-foreground";
}

export function parseAvenMessages(data: unknown): AvenMessage[] {
  if (Array.isArray(data)) return data as AvenMessage[];
  if (data && typeof data === "object") {
    const inner =
      (data as { messages?: unknown }).messages ??
      (data as { conversation?: { messages?: unknown } }).conversation
        ?.messages;
    if (Array.isArray(inner)) return inner as AvenMessage[];
  }
  return [];
}
