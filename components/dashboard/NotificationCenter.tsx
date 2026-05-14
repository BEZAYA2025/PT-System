"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IconBell,
  IconAlertTriangle,
  IconInfoCircle,
  IconTargetArrow,
  IconX,
  IconCheck,
  IconRefresh,
  IconAlertCircle,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { timeAgo } from "@/lib/format";
import {
  shapeNotification,
  shapeNotificationsResponse,
  type NotificationItem,
  type NotificationKind,
} from "@/lib/notifications";

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

interface Props {
  /** SSR seed — populates the bell badge instantly. */
  initial: NotificationItem[];
  /** SSR seed of unread_count from the backend. */
  initialUnreadCount: number;
}

export function NotificationCenter({ initial, initialUnreadCount }: Props) {
  const [list, setList] = useState<NotificationItem[]>(initial);
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulseToken, setPulseToken] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);

  // ---------------------------------------------------------------------------
  // Fetch + dedup helpers
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
        setError(`Notifications ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => null);
      const shaped = shapeNotificationsResponse(data);
      setList(shaped.notifications);
      setUnreadCount(shaped.unreadCount);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [list.length]);

  // Refresh on tab visibility — catches missed events.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchOnce();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [fetchOnce]);

  // Listen to SSE-driven notifications dispatched by the Aven chat hook.
  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<unknown>;
      const shaped = shapeNotification(ce.detail);
      if (!shaped) return;
      setList((prev) => {
        if (prev.some((n) => n.id === shaped.id)) return prev;
        return [shaped, ...prev];
      });
      setUnreadCount((c) => c + (shaped.read ? 0 : 1));
      setPulseToken((t) => t + 1); // restart bell pulse
    };
    window.addEventListener("pt-system:notification", handler);
    return () => window.removeEventListener("pt-system:notification", handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Mark-read mutations (optimistic with rollback)
  // ---------------------------------------------------------------------------

  const markRead = useCallback(async (id: string) => {
    let prevList: NotificationItem[] = [];
    let prevCount = 0;
    setList((cur) => {
      prevList = cur;
      const next = cur.map((n) =>
        n.id === id && !n.read ? { ...n, read: true } : n,
      );
      return next;
    });
    setUnreadCount((c) => {
      prevCount = c;
      const target = prevList.find((n) => n.id === id);
      return target && !target.read ? Math.max(0, c - 1) : c;
    });

    try {
      const res = await fetch(`/api/proxy/notifications/${id}/read`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Mark-read ${res.status}`);
    } catch {
      // Roll back local state
      setList(prevList);
      setUnreadCount(prevCount);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    let prevList: NotificationItem[] = [];
    let prevCount = 0;
    setList((cur) => {
      prevList = cur;
      return cur.map((n) => ({ ...n, read: true }));
    });
    setUnreadCount((c) => {
      prevCount = c;
      return 0;
    });

    try {
      const res = await fetch("/api/proxy/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Mark-all ${res.status}`);
    } catch {
      setList(prevList);
      setUnreadCount(prevCount);
    }
  }, [unreadCount]);

  // ---------------------------------------------------------------------------
  // Click-outside / ESC for the panel
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
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

  return (
    <>
      <div ref={wrapperRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            // Re-sync on open in case we opened with stale local state.
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
              list={list}
              loading={loading}
              error={error}
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
          description={detail.detail}
          size="md"
        >
          <NotificationDetailBody item={detail} />
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function BellWithPulse({ pulseToken }: { pulseToken: number }) {
  // Re-mount the icon when pulseToken changes so the animation restarts.
  return (
    <span
      key={pulseToken}
      className={
        pulseToken > 0
          ? "inline-flex animate-[wiggle_0.6s_ease-in-out]"
          : "inline-flex"
      }
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
  list,
  loading,
  error,
  hasUnread,
  onClose,
  onMarkAllRead,
  onClick,
  onRetry,
}: {
  list: NotificationItem[];
  loading: boolean;
  error: string | null;
  hasUnread: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onClick: (n: NotificationItem) => void;
  onRetry: () => void;
}) {
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
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className={[
          "fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl",
          "inset-x-3 bottom-3 max-h-[78vh]",
          "sm:bottom-auto sm:left-auto sm:right-3 sm:top-16 sm:inset-x-auto sm:w-[380px] sm:max-h-[70vh]",
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
                  : `${list.filter((n) => !n.read).length} unread · ${list.length} total`}
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

        {error && (
          <div className="border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <p className="flex items-center gap-2 text-amber-200">
                <IconAlertCircle size={14} stroke={1.75} aria-hidden />
                Couldn&apos;t load notifications
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
        ) : list.length === 0 && !error ? (
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
          <p
            className={[
              "text-sm",
              item.read
                ? "text-muted-foreground"
                : "font-medium text-foreground",
            ].join(" ")}
          >
            {item.title}
          </p>
          {item.detail && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.detail}
            </p>
          )}
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {tone.label} · {timeAgo(item.ts)}
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

function NotificationDetailBody({ item }: { item: NotificationItem }) {
  const tone = KIND_TONE[item.kind];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.iconBg} ${tone.iconText}`}
        >
          <KindIcon kind={item.kind} />
          {tone.label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {timeAgo(item.ts)}
        </span>
      </div>

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

      {item.kind === "setup" && (
        <p className="rounded-lg border border-dashed border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
          Chart preview + Aven context land in iteration 7 alongside deep-link
          actions.
        </p>
      )}
      {item.kind === "trade" && (
        <p className="rounded-lg border border-dashed border-border bg-surface/40 px-4 py-3 text-xs text-muted-foreground">
          Trade view + position-level chart land in iteration 7.
        </p>
      )}
    </div>
  );
}
