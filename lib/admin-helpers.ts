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
