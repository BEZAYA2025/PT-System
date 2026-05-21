// Train-Aven sparring — canonical message shape + response shapers.
//
// One shape feeds the chat from TWO sources:
//   · GET /api/proxy/admin/aven/conversations  (history on mount)
//   · POST /api/proxy/admin/aven/sparring-chat (live blocks per turn)
//
// Both endpoints map strictly to SparringMessage — no shape drift
// between history and live. The ChatBubbleList renderer is happy
// because SparringMessage is structurally compatible with
// ChatBubbleListMessage (created_at + role + content + id all
// match).

export type SparringRole = "user" | "aven";

export interface SparringMessage {
  /** Backend-assigned message id. For optimistic local rows that
   *  haven't yet round-tripped, this is the temporary string from
   *  newLocalId() below and gets replaced when the real id lands. */
  id: string;
  role: SparringRole;
  content: string;
  /** ISO-8601 string. ChatBubbleList reads this as `created_at` and
   *  groups by UTC day. Keep this canonical even if the backend
   *  emits `timestamp` or `ts` — the shapers normalise. */
  created_at: string;
  /** Canonical display name for the user side. Backend supplies it
   *  per-message (Paul gets "Paul", another founder would get their
   *  own name). undefined on optimistic local rows until the real
   *  user_message replaces them. */
  user_display_name?: string;
  /** Multimodal: backend sets has_image=true on user turns that
   *  carried a chart screenshot. The image data itself may also
   *  come back as image_base64 + image_media_type (live response
   *  echo) or as an image_url (history reload from storage) — the
   *  bubble renderer picks whichever is present. has_image alone
   *  drives the "[Chart attached]" placeholder when the backend
   *  doesn't include the image bytes themselves. */
  has_image?: boolean;
  image_base64?: string;
  image_media_type?: string;
  image_url?: string;
}

export interface StudioMessage extends SparringMessage {
  /** Set on optimistic local rows before the server confirms.
   *  When the real user_message lands with the same role+content,
   *  the row carrying localId is replaced in place rather than
   *  duplicated. */
  localId?: string;
  status?: "sending" | "sent" | "failed";
}

export interface SparringChatResponse {
  user_message: SparringMessage;
  aven_message: SparringMessage;
  /** Backend may attach VKB/curriculum/quality context — surfaced
   *  to the founder-tool affordances later, not used by the chat
   *  render itself. */
  context?: Record<string, unknown>;
  quality_score?: number;
}

export interface SttResponse {
  text: string;
  language?: string;
  duration_ms?: number;
}

export function newLocalId(prefix: "user" | "voice" = "user"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Multimodal image-upload limits per ADMIN_API_SPEC T1:
//   · decoded bytes ≤ 10 MB (oversize → backend returns 413)
//   · PNG or JPEG only
//   · invalid base64 → 400
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_ACCEPTED_TYPES = ["image/png", "image/jpeg"] as const;

export type ImageValidationError =
  | { kind: "too_large"; size: number }
  | { kind: "wrong_type"; type: string };

/** Frontend pre-flight: catches the obvious 413 / 400 cases before
 *  the network round-trip. Returns null when the file is acceptable. */
export function validateImage(file: File): ImageValidationError | null {
  if (file.size > IMAGE_MAX_BYTES) {
    return { kind: "too_large", size: file.size };
  }
  if (
    !(IMAGE_ACCEPTED_TYPES as readonly string[]).includes(file.type)
  ) {
    return { kind: "wrong_type", type: file.type };
  }
  return null;
}

/** Read a File as base64 WITHOUT the data: URI prefix.
 *
 *  Backend contract (ADMIN_API_SPEC T1) takes raw base64 in
 *  `image_base64` and a separate `image_media_type` field for the
 *  MIME — sending the data: URI prefix would double-encode the type
 *  and most likely produce the 400 "invalid base64" path.
 *
 *  If a future backend revision wants the data: prefix, swap this
 *  helper to return the full result.split(",", 1)[0] + "," + base64
 *  — single point of change. */
export function fileToBase64(
  file: File,
): Promise<{ base64: string; media_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("FileReader returned non-string"));
        return;
      }
      // result is "data:image/png;base64,iVBORw0KG..."
      const comma = result.indexOf(",");
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      resolve({ base64, media_type: file.type });
    };
    reader.readAsDataURL(file);
  });
}

// Read a string from a few plausible field names. Backend has
// stabilised on `content` but old transcripts emitted `text` /
// `message` — keep the fallbacks so a stale row doesn't render
// blank.
function pickContent(raw: Record<string, unknown>): string {
  const c = raw.content ?? raw.text ?? raw.message;
  return typeof c === "string" ? c : "";
}

function pickTimestamp(raw: Record<string, unknown>): string {
  const t = raw.created_at ?? raw.timestamp ?? raw.ts;
  return typeof t === "string" ? t : new Date().toISOString();
}

function pickRole(raw: Record<string, unknown>): SparringRole | null {
  const r = (raw.role ?? raw.speaker ?? raw.author ?? "").toString().toLowerCase();
  if (r === "user" || r === "member" || r === "founder") return "user";
  if (r === "aven" || r === "assistant" || r === "bot") return "aven";
  return null;
}

/** Best-effort coercion from a raw backend object to SparringMessage.
 *  Returns null if the row is structurally too broken to render —
 *  callers should filter nulls when batch-shaping a list. */
export function shapeSparringMessage(raw: unknown): SparringMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const role = pickRole(r);
  if (!role) return null;
  const id = typeof r.id === "string" ? r.id : String(r.id ?? "");
  if (!id) return null;
  const content = pickContent(r);
  // Image-only bubbles are legitimate (Paul drops a chart with no
  // caption). Don't reject on empty content if the row carries an
  // image flag instead.
  const has_image = r.has_image === true;
  if (!content && !has_image) return null;
  const created_at = pickTimestamp(r);
  const user_display_name =
    typeof r.user_display_name === "string" ? r.user_display_name : undefined;
  const image_base64 =
    typeof r.image_base64 === "string" ? r.image_base64 : undefined;
  const image_media_type =
    typeof r.image_media_type === "string" ? r.image_media_type : undefined;
  const image_url = typeof r.image_url === "string" ? r.image_url : undefined;
  return {
    id,
    role,
    content,
    created_at,
    user_display_name,
    ...(has_image ? { has_image: true } : {}),
    ...(image_base64 ? { image_base64 } : {}),
    ...(image_media_type ? { image_media_type } : {}),
    ...(image_url ? { image_url } : {}),
  };
}

export interface HistoryResponse {
  messages: SparringMessage[];
  /** Surfaced canonical display name from the first user-role hit
   *  in the history — used as the chat's userLabel even before
   *  the first live turn lands. Falls back to "Du" at render. */
  user_display_name: string | null;
}

/** Shape the conversations endpoint response. Accepts `hits[]`,
 *  `messages[]`, or a bare array — backend's been migrating field
 *  names so the shaper stays loose. */
export function shapeHistoryResponse(raw: unknown): HistoryResponse {
  const list: unknown[] = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { hits?: unknown[] })?.hits)
      ? ((raw as { hits: unknown[] }).hits)
      : Array.isArray((raw as { messages?: unknown[] })?.messages)
        ? ((raw as { messages: unknown[] }).messages)
        : [];
  const shaped: SparringMessage[] = [];
  let displayName: string | null = null;
  for (const item of list) {
    const m = shapeSparringMessage(item);
    if (!m) continue;
    shaped.push(m);
    if (!displayName && m.role === "user" && m.user_display_name) {
      displayName = m.user_display_name;
    }
  }
  return { messages: shaped, user_display_name: displayName };
}
