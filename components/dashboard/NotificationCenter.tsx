"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconBell,
  IconAlertTriangle,
  IconChartCandle,
  IconCheck,
  IconInfoCircle,
  IconMessageCircle,
  IconRefresh,
  IconTargetArrow,
  IconX,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { timeAgo } from "@/lib/format";
import {
  shapeNotification,
  shapeNotificationsResponse,
  type NotificationItem,
  type NotificationKind,
  type NotificationSeverity,
} from "@/lib/notifications";

// Round-15 notifications: severity drives the badge colour ladder in
// both the bell-row and the detail modal.
const SEVERITY_TONE: Record<
  NotificationSeverity,
  { bg: string; text: string; ring: string; label: string }
> = {
  watch: {
    bg: "bg-yellow-400/[0.12]",
    text: "text-yellow-200",
    ring: "ring-yellow-400/40",
    label: "Watch",
  },
  warn: {
    bg: "bg-amber-500/[0.14]",
    text: "text-amber-200",
    ring: "ring-amber-500/40",
    label: "Warn",
  },
  critical: {
    bg: "bg-red-500/[0.14]",
    text: "text-red-200",
    ring: "ring-red-500/45",
    label: "Critical",
  },
};

function SeverityBadge({ severity }: { severity: NotificationSeverity }) {
  const tone = SEVERITY_TONE[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.bg} ${tone.text}`}
    >
      {tone.label}
    </span>
  );
}

const KIND_TONE: Record<
  NotificationKind,
  { iconBg: string; iconText: string; ringWhenUnread: string; label: string }
> = {
  setup: {
    iconBg: "bg-emerald/[0.12]",
    iconText: "text-emerald",
    ringWhenUnread: "ring-emerald/30",
    label: "Setup",
  },
  trade: {
    iconBg: "bg-amber-500/[0.12]",
    iconText: "text-amber-300",
    ringWhenUnread: "ring-amber-500/30",
    label: "Trade",
  },
  system: {
    iconBg: "bg-sky-500/[0.12]",
    iconText: "text-sky-300",
    ringWhenUnread: "ring-sky-500/30",
    label: "System",
  },
};

function KindIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "setup")
    return <IconTargetArrow size={16} stroke={1.75} aria-hidden />;
  if (kind === "trade")
    return <IconAlertTriangle size={16} stroke={1.75} aria-hidden />;
  return <IconInfoCircle size={16} stroke={1.75} aria-hidden />;
}

// ---------------------------------------------------------------------------
// Tiny inline markdown: **bold**, *bold* (Telegram), _italic_, \n → <br>.
// Notification bodies come straight from the bot so they contain Telegram-
// style formatting tokens. Render them as React nodes rather than literal
// asterisks.
// ---------------------------------------------------------------------------

const INLINE_TOKEN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|_[^_\n]+_)/;

function parseInlineMarkdown(line: string): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = line;
  let key = 0;
  while (remaining.length > 0) {
    const m = remaining.match(INLINE_TOKEN);
    if (!m || m.index === undefined) {
      parts.push(remaining);
      break;
    }
    if (m.index > 0) parts.push(remaining.slice(0, m.index));
    const token = m[1];
    if (token.startsWith("**")) {
      parts.push(
        <strong key={`b${key++}`} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*")) {
      parts.push(
        <strong key={`b${key++}`} className="font-semibold text-foreground">
          {token.slice(1, -1)}
        </strong>,
      );
    } else if (token.startsWith("_")) {
      parts.push(
        <em key={`i${key++}`} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    remaining = remaining.slice(m.index + token.length);
  }
  return <>{parts}</>;
}

function renderMarkdown(text: string): ReactNode {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {parseInlineMarkdown(line)}
          {i < lines.length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Structured setup-payload detection. When backend includes the relevant
// metadata fields, the detail modal swaps the raw text body for the
// Enhanced Setup Card.
// ---------------------------------------------------------------------------

interface StructuredSetup {
  symbol: string;
  side: string;
  score: number | null;
  entry: number | null;
  sl: number | null;
  tp: number | null;
  timeframe: string | null;
  confluence: string | null;
}

function detectStructuredSetup(
  item: NotificationItem,
): StructuredSetup | null {
  if (item.kind !== "setup") return null;
  const m = item.metadata;
  if (!m || typeof m !== "object") return null;
  const symbol =
    typeof m.symbol === "string" && m.symbol.length > 0 ? m.symbol : null;
  const side =
    typeof m.side === "string" && m.side.length > 0 ? m.side : null;
  if (!symbol || !side) return null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;
  return {
    symbol,
    side,
    score: num(m.score),
    entry: num(m.entry) ?? num(m.entry_price),
    sl: num(m.sl) ?? num(m.stop_loss),
    tp: num(m.tp) ?? num(m.take_profit),
    timeframe: str(m.timeframe),
    confluence: str(m.confluence) ?? str(m.confluence_text),
  };
}

function fmtPrice(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

// ---------------------------------------------------------------------------

interface Props {
  /** SSR seed — populates the bell badge instantly. */
  initial: NotificationItem[];
  /** SSR seed of unread_count from the backend. Kept for API compatibility
   *  but ignored — bell + dropdown both derive from `list` now. */
  initialUnreadCount?: number;
}

export function NotificationCenter({ initial }: Props) {
  const [list, setList] = useState<NotificationItem[]>(initial);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseToken, setPulseToken] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  // Single source of truth: bell, dropdown header, and ARIA label all
  // derive the unread count from the same `list`. Bell+dropdown can't drift.
  const unreadCount = list.filter((n) => !n.read).length;

  // ---------------------------------------------------------------------------
  // Fetch
  // ---------------------------------------------------------------------------

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(list.length === 0);
    try {
      const res = await fetch("/api/proxy/notifications?limit=50", {
        cache: "no-store",
      });
      if (!res.ok) {
        // Keep any existing list. Only surface a banner when we genuinely
        // have nothing to show.
        setError(`Notifications ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => null);
      const shaped = shapeNotificationsResponse(data);
      setList(shaped.notifications);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [list.length]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchOnce();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchOnce]);

  // SSE-driven notifications (dispatched by the Aven chat hook).
  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<unknown>;
      const shaped = shapeNotification(ce.detail);
      if (!shaped) return;
      setList((prev) => {
        if (prev.some((n) => n.id === shaped.id)) return prev;
        return [shaped, ...prev];
      });
      setPulseToken((t) => t + 1);
    };
    window.addEventListener("pt-system:notification", handler);
    return () =>
      window.removeEventListener("pt-system:notification", handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Mark-read (optimistic with rollback)
  // ---------------------------------------------------------------------------

  const markRead = useCallback(async (id: string) => {
    let prevList: NotificationItem[] = [];
    setList((cur) => {
      prevList = cur;
      return cur.map((n) =>
        n.id === id && !n.read ? { ...n, read: true } : n,
      );
    });
    try {
      const res = await fetch(`/api/proxy/notifications/${id}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Mark-read ${res.status}`);
    } catch {
      setList(prevList);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    let prevList: NotificationItem[] = [];
    setList((cur) => {
      prevList = cur;
      return cur.map((n) => ({ ...n, read: true }));
    });
    try {
      const res = await fetch("/api/proxy/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Mark-all ${res.status}`);
    } catch {
      setList(prevList);
    }
  }, [unreadCount]);

  // ---------------------------------------------------------------------------
  // Click-outside / ESC — accounts for the portal'd panel
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapperRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) void markRead(n.id);
    setDetail(n);
    setOpen(false);
  };

  // Only show the error banner when the list is empty — partial failures
  // shouldn't blame the user-visible UI when there's still data to read.
  const showError = error !== null && list.length === 0;

  return (
    <>
      <div ref={wrapperRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void fetchOnce();
          }}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          aria-expanded={open}
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <BellWithPulse pulseToken={pulseToken} />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-semibold leading-[18px] text-background"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open &&
          typeof document !== "undefined" &&
          createPortal(
            <NotificationPanel
              panelRef={panelRef}
              list={list}
              loading={loading}
              showError={showError}
              errorDetail={error}
              hasUnread={unreadCount > 0}
              onClose={() => setOpen(false)}
              onMarkAllRead={() => void markAllRead()}
              onClick={handleNotificationClick}
              onRetry={() => void fetchOnce()}
            />,
            document.body,
          )}
      </div>

      {detail && (
        <Modal
          open={true}
          onClose={() => setDetail(null)}
          title={detail.title}
          size="md"
        >
          <NotificationDetailBody
            item={detail}
            onMarkRead={() => {
              if (!detail.read) void markRead(detail.id);
              setDetail(null);
            }}
            onAvenExplain={() => {
              window.dispatchEvent(
                new CustomEvent("pt-system:aven-explain", {
                  detail: { notification: detail },
                }),
              );
              setDetail(null);
            }}
          />
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function BellWithPulse({ pulseToken }: { pulseToken: number }) {
  return (
    <span
      key={pulseToken}
      className="inline-flex"
      style={{
        animation: pulseToken > 0 ? "ptBellRing 0.8s ease-in-out" : undefined,
      }}
    >
      <IconBell size={18} stroke={1.75} />
      <style>{`
        @keyframes ptBellRing {
          0% { transform: rotate(0); }
          15% { transform: rotate(12deg); }
          30% { transform: rotate(-12deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(4deg); }
          100% { transform: rotate(0); }
        }
      `}</style>
    </span>
  );
}

// ---------------------------------------------------------------------------

function NotificationPanel({
  panelRef,
  list,
  loading,
  showError,
  errorDetail,
  hasUnread,
  onClose,
  onMarkAllRead,
  onClick,
  onRetry,
}: {
  panelRef: React.RefObject<HTMLDivElement | null>;
  list: NotificationItem[];
  loading: boolean;
  showError: boolean;
  errorDetail: string | null;
  hasUnread: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClick: (n: NotificationItem) => void;
  onRetry: () => void;
}) {
  const unread = list.filter((n) => !n.read).length;
  return (
    <>
      {/* Mobile backdrop */}
      <button
        type="button"
        aria-label="Close notifications"
        onClick={onClose}
        className="fixed inset-0 z-40 cursor-default bg-background/60 backdrop-blur-sm sm:hidden"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className={[
          "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl",
          "inset-x-3 bottom-3 max-h-[78vh]",
          "sm:bottom-auto sm:left-auto sm:right-3 sm:top-16 sm:inset-x-auto sm:w-[400px] sm:max-h-[70vh]",
        ].join(" ")}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Notifications
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {loading
                ? "Loading…"
                : list.length === 0
                  ? "Empty"
                  : `${unread} unread · ${list.length} total`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasUnread && !loading && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              >
                <IconCheck size={12} stroke={2} />
                Mark all read
              </button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <IconX size={14} stroke={1.75} />
            </button>
          </div>
        </header>

        {showError && errorDetail && (
          <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <p className="flex items-center gap-2 text-amber-200">
                <IconAlertCircle size={14} stroke={1.75} aria-hidden />
                Couldn&apos;t load notifications · {errorDetail}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground transition-colors hover:border-foreground/30"
              >
                <IconRefresh size={11} stroke={2} />
                Retry
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <SkeletonList />
        ) : list.length === 0 && !showError ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className="text-center">
              <span className="mx-auto mb-3 inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                <IconBell size={18} stroke={1.5} />
              </span>
              <p className="text-sm text-muted-foreground">
                No notifications yet —
                <br />
                Aven will alert you here.
              </p>
            </div>
          </div>
        ) : (
          <ul role="list" className="flex-1 divide-y divide-border overflow-y-auto">
            <AnimatePresence initial={false} mode="popLayout">
              {list.map((n) => (
                <motion.li
                  key={n.id}
                  layout="position"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NotificationRowInner
                    item={n}
                    onClick={() => onClick(n)}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </>
  );
}

function SkeletonList() {
  return (
    <ul role="list" aria-busy="true" className="flex-1 divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-start gap-3 px-4 py-3">
          <span className="size-8 shrink-0 animate-pulse rounded-full bg-surface" />
          <div className="flex-1 space-y-1.5">
            <span className="block h-3 w-3/4 animate-pulse rounded bg-surface" />
            <span className="block h-3 w-1/2 animate-pulse rounded bg-surface" />
            <span className="block h-2 w-1/3 animate-pulse rounded bg-surface" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------

function NotificationRowInner({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const tone = KIND_TONE[item.kind];

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        item.read
          ? "bg-transparent hover:bg-surface"
          : "bg-emerald/[0.03] hover:bg-emerald/[0.06]",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
          tone.iconBg,
          tone.iconText,
          !item.read ? `ring-2 ${tone.ringWhenUnread}` : "",
        ].join(" ")}
      >
        <KindIcon kind={item.kind} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p
            className={[
              "line-clamp-2 flex-1 text-sm",
              item.read
                ? "text-muted-foreground"
                : "font-medium text-foreground",
            ].join(" ")}
          >
            {item.title}
          </p>
          {item.severity && <SeverityBadge severity={item.severity} />}
        </div>
        {item.detail && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {renderMarkdown(item.detail)}
          </p>
        )}
        <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>
            {tone.label} · {timeAgo(item.ts)}
          </span>
          {item.hasChart && (
            <span
              className="inline-flex items-center gap-1 text-emerald/70"
              aria-label="Chart attached"
            >
              <IconChartCandle size={10} stroke={1.75} aria-hidden />
            </span>
          )}
        </p>
      </div>
      {!item.read && (
        <span
          aria-hidden
          className="mt-2 inline-flex size-1.5 shrink-0 rounded-full bg-emerald"
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------

function NotificationDetailBody({
  item,
  onMarkRead,
  onAvenExplain,
}: {
  item: NotificationItem;
  onMarkRead: () => void;
  onAvenExplain: () => void;
}) {
  const tone = KIND_TONE[item.kind];
  const structured = detectStructuredSetup(item);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.iconBg} ${tone.iconText}`}
        >
          <KindIcon kind={item.kind} />
          {tone.label}
        </span>
        {item.severity && <SeverityBadge severity={item.severity} />}
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {timeAgo(item.ts)}
        </span>
      </div>

      {item.hasChart && <NotificationChart id={item.id} title={item.title} />}

      {structured ? (
        <EnhancedSetupCard data={structured} />
      ) : item.detail ? (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-foreground">
          {renderMarkdown(item.detail)}
        </div>
      ) : null}

      {item.context && item.context.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Context
          </p>
          <ul className="mt-2 space-y-2 text-sm text-foreground">
            {item.context.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="text-emerald">
                  •
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action row — Aven explain is wired to a window event so AvenChat
       *  can pick it up; chart link is a placeholder until backend exposes
       *  a chart URL or symbol-aware route. */}
      <div className="flex flex-wrap gap-2">
        {item.kind === "setup" && (
          <button
            type="button"
            onClick={onAvenExplain}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-emerald-hover"
          >
            <IconMessageCircle size={12} stroke={2} />
            Aven explain
          </button>
        )}
        {structured && (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <IconChartCandle size={12} stroke={1.75} />
            Open chart
          </button>
        )}
        <button
          type="button"
          onClick={onMarkRead}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30"
        >
          <IconCheck size={12} stroke={2} />
          {item.read ? "Close" : "Mark read"}
        </button>
      </div>
    </div>
  );
}

// Round-15: chart image fetched lazily from
// /api/proxy/notifications/{id}/chart. Renders an <img> that swaps to
// an inline error block if the upstream 404s or the fetch fails. No
// extra request management here — <img> handles caching + retries via
// the proxy's Cache-Control header.
function NotificationChart({ id, title }: { id: string; title: string }) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-xs text-muted-foreground">
        Chart unavailable.
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/proxy/notifications/${id}/chart`}
      alt={`${title} chart`}
      onError={() => setErrored(true)}
      className="block w-full rounded-lg border border-border bg-surface"
    />
  );
}

function EnhancedSetupCard({ data }: { data: StructuredSetup }) {
  const sideTone =
    data.side.toLowerCase() === "short"
      ? "bg-red-500/[0.1] text-red-300"
      : "bg-emerald/[0.1] text-emerald";
  return (
    <div className="space-y-4 rounded-lg border border-emerald/20 bg-emerald/[0.04] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">
          {data.symbol}
        </span>
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase ${sideTone}`}
        >
          {data.side}
        </span>
        {data.timeframe && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {data.timeframe}
          </span>
        )}
        {data.score !== null && (
          <span className="ml-auto font-mono text-[11px] text-emerald">
            Score {data.score.toFixed(0)}/10
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SetupField label="Entry" value={fmtPrice(data.entry)} />
        <SetupField
          label="Stop loss"
          value={fmtPrice(data.sl)}
          tone="text-red-300"
        />
        <SetupField
          label="Take profit"
          value={fmtPrice(data.tp)}
          tone="text-emerald"
        />
      </div>

      {data.confluence && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Confluence
          </p>
          <p className="mt-1 text-sm text-foreground">{data.confluence}</p>
        </div>
      )}
    </div>
  );
}

function SetupField({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-sm font-semibold ${tone ?? "text-foreground"}`}
      >
        {value}
      </p>
    </div>
  );
}
