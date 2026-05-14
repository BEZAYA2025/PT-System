// Aven chat types — shared between server fetchers and the client hook.
// Adapter shapes confirmed against the live VPS-Phase-A.1 backend (May 2026).

export type ChatRole = "user" | "aven" | "system";
export type ChatSource = "web" | "telegram";
export type SendStatus = "sending" | "sent" | "failed";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: string;
  source: ChatSource;
  /** Set only on optimistic local rows still awaiting server confirmation. */
  localId?: string;
  status?: SendStatus;
  /** True when the backend flags the message as the daily greeting (via
   *  meta.greeting=true OR a top-level greeting field). */
  isGreeting?: boolean;
}

/**
 * Quota response from GET /api/aven/quota:
 *   { used, limit, remaining, allowed, unlimited }
 *   limit === null when VIP-unlimited.
 */
export interface QuotaState {
  used: number;
  limit: number | null;
  remaining: number;
  allowed: boolean;
  isUnlimited: boolean;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

const numericId = (v: unknown): string | null =>
  typeof v === "number" && Number.isFinite(v)
    ? String(v)
    : typeof v === "string" && v.trim().length > 0
      ? v.trim()
      : null;

function normaliseRole(v: unknown): ChatRole {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "aven" || s === "assistant" || s === "bot") return "aven";
  if (s === "user" || s === "member" || s === "human") return "user";
  return "system";
}

function normaliseSource(v: unknown): ChatSource {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  return s === "telegram" || s === "tg" ? "telegram" : "web";
}

export function shapeMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const id = numericId(t.id ?? t.message_id ?? t.msg_id);
  if (!id) return null;
  const content = str(t.content) ?? str(t.text) ?? str(t.message) ?? "";
  const ts =
    str(t.created_at) ??
    str(t.ts) ??
    str(t.timestamp) ??
    new Date().toISOString();
  // Backend SSE emits `channel` ("web" | "telegram"); REST emits `source`.
  const source = normaliseSource(t.source ?? t.channel);
  const meta =
    t.meta && typeof t.meta === "object"
      ? (t.meta as Record<string, unknown>)
      : t.metadata && typeof t.metadata === "object"
        ? (t.metadata as Record<string, unknown>)
        : null;
  const isGreeting =
    meta?.greeting === true ||
    t.greeting === true ||
    t.is_greeting === true;
  return {
    id,
    role: normaliseRole(t.role),
    content,
    ts,
    source,
    isGreeting: isGreeting || undefined,
  };
}

/**
 * Backend GET /api/aven/history response:
 *   { messages, has_more, next_before_id?, next_since_id? }
 * Falls back to a bare array for resilience.
 */
export interface HistoryResponse {
  messages: ChatMessage[];
  hasMore: boolean;
  nextBeforeId: number | null;
  nextSinceId: number | null;
}

export function shapeHistoryResponse(raw: unknown): HistoryResponse {
  let arr: unknown[] = [];
  let hasMore = false;
  let nextBeforeId: number | null = null;
  let nextSinceId: number | null = null;

  if (Array.isArray(raw)) {
    arr = raw;
    hasMore = arr.length >= 50;
  } else if (raw && typeof raw === "object") {
    const t = raw as Record<string, unknown>;
    if (Array.isArray(t.messages)) arr = t.messages;
    if (typeof t.has_more === "boolean") hasMore = t.has_more;
    nextBeforeId = num(t.next_before_id);
    nextSinceId = num(t.next_since_id);
  }

  const messages = arr
    .map(shapeMessage)
    .filter((m): m is ChatMessage => m !== null);

  return { messages, hasMore, nextBeforeId, nextSinceId };
}

/** Convenience: legacy callers that only want the array. */
export function shapeMessages(raw: unknown): ChatMessage[] {
  return shapeHistoryResponse(raw).messages;
}

export function shapeQuota(raw: unknown): QuotaState | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const used = num(t.used) ?? num(t.total_used) ?? 0;
  // limit is intentionally allowed to be `null` from the backend → unlimited.
  const limit =
    t.limit === null
      ? null
      : (num(t.limit) ?? num(t.total_today) ?? null);
  const explicitRemaining = num(t.remaining) ?? num(t.remaining_today);
  const remaining =
    explicitRemaining ?? (limit !== null ? Math.max(0, limit - used) : 0);
  const isUnlimited =
    t.unlimited === true || limit === null;
  const allowed =
    typeof t.allowed === "boolean"
      ? t.allowed
      : isUnlimited || remaining > 0;
  return { used, limit, remaining, allowed, isUnlimited };
}

/**
 * Backend POST /api/aven/chat response:
 *   { message_id, user_message_id, reply, quota }
 * Tolerates legacy keys (response, response_id, aven_message_id, user_message,
 * aven_message) so partial backend roll-outs don't break the UI.
 */
export interface ChatPostResult {
  userMessageId: string | null;
  avenMessageId: string | null;
  reply: string | null;
  /** Optional content echo for the user message; backend rarely returns it
   *  but the hook can fall back to its locally-sent text either way. */
  userContentEcho: string | null;
  quota: QuotaState | null;
}

export function shapeChatPost(raw: unknown): ChatPostResult {
  if (!raw || typeof raw !== "object") {
    return {
      userMessageId: null,
      avenMessageId: null,
      reply: null,
      userContentEcho: null,
      quota: null,
    };
  }
  const t = raw as Record<string, unknown>;

  // Legacy nested shape (kept for transition):
  if (
    t.user_message &&
    typeof t.user_message === "object" &&
    t.aven_message &&
    typeof t.aven_message === "object"
  ) {
    const u = shapeMessage(t.user_message);
    const a = shapeMessage(t.aven_message);
    return {
      userMessageId: u?.id ?? null,
      avenMessageId: a?.id ?? null,
      reply: a?.content ?? null,
      userContentEcho: u?.content ?? null,
      quota: shapeQuota(t.quota),
    };
  }

  // Flat shape (current backend):
  return {
    userMessageId: numericId(t.user_message_id),
    avenMessageId: numericId(t.message_id ?? t.aven_message_id ?? t.response_id),
    reply: str(t.reply) ?? str(t.response),
    userContentEcho: str(t.user_content),
    quota: shapeQuota(t.quota),
  };
}
