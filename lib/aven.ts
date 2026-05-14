// Aven chat types — shared between server fetchers and the client hook.

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

export interface QuotaState {
  remaining_today: number;
  total_today: number;
  tier: "standard" | "vip";
  /** Frontend-derived: limit === null when tier is VIP (unlimited). */
  isUnlimited: boolean;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

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
  const idRaw = t.id ?? t.message_id ?? t.msg_id;
  const id =
    typeof idRaw === "number"
      ? String(idRaw)
      : typeof idRaw === "string"
        ? idRaw
        : null;
  if (!id) return null;
  const content = str(t.content) ?? str(t.text) ?? str(t.message) ?? "";
  const ts = str(t.ts) ?? str(t.created_at) ?? str(t.timestamp) ?? new Date().toISOString();
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
    source: normaliseSource(t.source),
    isGreeting: isGreeting || undefined,
  };
}

export function shapeMessages(raw: unknown): ChatMessage[] {
  let arr: unknown[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object" && Array.isArray((raw as { messages?: unknown }).messages)) {
    arr = (raw as { messages: unknown[] }).messages;
  } else {
    arr = [];
  }
  return arr
    .map(shapeMessage)
    .filter((m): m is ChatMessage => m !== null);
}

export function shapeQuota(raw: unknown): QuotaState | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const remaining = num(t.remaining_today) ?? num(t.remaining) ?? 0;
  const total = num(t.total_today) ?? num(t.total) ?? 0;
  const tier =
    str(t.tier)?.toLowerCase() === "vip" ? "vip" : "standard";
  return {
    remaining_today: remaining,
    total_today: total,
    tier,
    isUnlimited: tier === "vip" || total === 0,
  };
}

/**
 * Shape returned by POST /api/aven/chat. Defensive across two plausible
 * server layouts:
 *   { user_message: {...}, aven_message: {...}, quota: {...} }
 *   { message_id: 123, response: "...", response_id: 124, quota: {...} }
 */
export interface ChatPostResult {
  userMessage: ChatMessage | null;
  avenMessage: ChatMessage | null;
  quota: QuotaState | null;
}

export function shapeChatPost(raw: unknown): ChatPostResult {
  if (!raw || typeof raw !== "object") {
    return { userMessage: null, avenMessage: null, quota: null };
  }
  const t = raw as Record<string, unknown>;

  // Layout A: explicit objects
  const userMsg = shapeMessage(t.user_message);
  const avenMsg = shapeMessage(t.aven_message);
  if (userMsg || avenMsg) {
    return {
      userMessage: userMsg,
      avenMessage: avenMsg,
      quota: shapeQuota(t.quota),
    };
  }

  // Layout B: flat shape with message_id + response
  const userId = t.message_id;
  const avenId = t.response_id ?? t.aven_id;
  const flatUser =
    userId !== undefined
      ? shapeMessage({
          id: userId,
          role: "user",
          content: t.user_content ?? "",
          source: "web",
        })
      : null;
  const flatAven =
    avenId !== undefined
      ? shapeMessage({
          id: avenId,
          role: "aven",
          content: t.response ?? "",
          source: "web",
        })
      : null;
  return {
    userMessage: flatUser,
    avenMessage: flatAven,
    quota: shapeQuota(t.quota),
  };
}
