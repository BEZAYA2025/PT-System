// Defensive adapter for /api/notifications. Backend shape:
//   { id, type, title, body, metadata, created_at, read_at }
//   type: 'setup_alert' | 'trade_alert' | 'system'

export type NotificationKind = "setup" | "trade" | "system";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  ts: string;
  read: boolean;
  /** Raw metadata blob from backend; used to render the detail modal. */
  metadata?: Record<string, unknown>;
  /** Pre-formatted context bullets for the detail modal. Computed from
   *  metadata when present. */
  context?: string[];
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function normaliseKind(v: unknown): NotificationKind {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s.startsWith("setup")) return "setup";
  if (s.startsWith("trade")) return "trade";
  return "system";
}

function bulletsFromMetadata(
  kind: NotificationKind,
  metadata: Record<string, unknown> | undefined,
): string[] {
  if (!metadata) return [];
  const bullets: string[] = [];

  if (kind === "setup") {
    const symbol = str(metadata.symbol);
    const side = str(metadata.side);
    const tf = str(metadata.timeframe);
    const score = num(metadata.score);
    if (symbol) bullets.push(`Symbol: ${symbol}`);
    if (side) bullets.push(`Side: ${side.toUpperCase()}`);
    if (tf) bullets.push(`Timeframe: ${tf}`);
    if (score !== null) bullets.push(`Score: ${score.toFixed(2)}`);
    return bullets;
  }

  if (kind === "trade") {
    const symbol = str(metadata.symbol);
    const eventType = str(metadata.event_type);
    const severity = str(metadata.severity);
    if (symbol) bullets.push(`Symbol: ${symbol}`);
    if (eventType) bullets.push(`Event: ${eventType.replace(/_/g, " ")}`);
    if (severity)
      bullets.push(`Severity: ${severity[0].toUpperCase()}${severity.slice(1)}`);
    return bullets;
  }

  // system: pretty-print top-level scalars only
  for (const [k, v] of Object.entries(metadata)) {
    if (typeof v === "string" || typeof v === "number") {
      bullets.push(`${k.replace(/_/g, " ")}: ${v}`);
    }
    if (bullets.length >= 5) break;
  }
  return bullets;
}

export function shapeNotification(raw: unknown): NotificationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;

  const idRaw = t.id ?? t.notification_id;
  const id =
    typeof idRaw === "number"
      ? String(idRaw)
      : typeof idRaw === "string"
        ? idRaw
        : null;
  if (!id) return null;

  const kind = normaliseKind(t.type ?? t.kind);
  const title = str(t.title) ?? "Notification";
  const detail = str(t.body) ?? str(t.detail) ?? str(t.message) ?? "";
  const ts =
    str(t.created_at) ??
    str(t.ts) ??
    str(t.timestamp) ??
    new Date().toISOString();
  const readAt = str(t.read_at);
  const metadata =
    t.metadata && typeof t.metadata === "object"
      ? (t.metadata as Record<string, unknown>)
      : undefined;

  return {
    id,
    kind,
    title,
    detail,
    ts,
    read: readAt !== null,
    metadata,
    context: bulletsFromMetadata(kind, metadata),
  };
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
}

export function shapeNotificationsResponse(
  raw: unknown,
): NotificationsResponse {
  if (!raw || typeof raw !== "object") {
    return { notifications: [], unreadCount: 0, totalCount: 0 };
  }
  const t = raw as Record<string, unknown>;
  const list = Array.isArray(t.notifications)
    ? t.notifications
    : Array.isArray(raw as unknown[])
      ? (raw as unknown[])
      : [];
  const items = list
    .map(shapeNotification)
    .filter((n): n is NotificationItem => n !== null);
  return {
    notifications: items,
    unreadCount: num(t.unread_count) ?? items.filter((n) => !n.read).length,
    totalCount: num(t.total_count) ?? items.length,
  };
}
