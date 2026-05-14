"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconBell,
  IconAlertTriangle,
  IconInfoCircle,
  IconTargetArrow,
  IconX,
  IconCheck,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { timeAgo } from "@/lib/format";
import type {
  NotificationItem,
  NotificationKind,
} from "@/lib/mock-dashboard";

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
  initial: NotificationItem[];
}

export function NotificationCenter({ initial }: Props) {
  const [list, setList] = useState<NotificationItem[]>(initial);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<NotificationItem | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const unread = list.filter((n) => !n.read).length;

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

  const markRead = (id: string) => {
    setList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    // Iter 6: POST /api/proxy/notifications/{id}/read
  };

  const markAllRead = () => {
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
    // Iter 6: POST /api/proxy/notifications/read-all
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) markRead(n.id);
    setDetail(n);
    setOpen(false);
  };

  return (
    <>
      <div ref={wrapperRef} className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={
            unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
          }
          aria-expanded={open}
          className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          <IconBell size={18} stroke={1.75} />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-semibold leading-[18px] text-background"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open &&
          typeof document !== "undefined" &&
          createPortal(
            <NotificationPanel
              list={list}
              onClose={() => setOpen(false)}
              onMarkAllRead={markAllRead}
              onClick={handleNotificationClick}
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

function NotificationPanel({
  list,
  onClose,
  onMarkAllRead,
  onClick,
}: {
  list: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onClick: (n: NotificationItem) => void;
}) {
  const hasUnread = list.some((n) => !n.read);

  return (
    <>
      {/* Mobile-only backdrop */}
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
          // Mobile: bottom sheet
          "inset-x-3 bottom-3 max-h-[78vh]",
          // Desktop: anchored top-right popover
          "sm:bottom-auto sm:left-auto sm:right-3 sm:top-16 sm:inset-x-auto sm:w-[380px] sm:max-h-[70vh]",
        ].join(" ")}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Notifications
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {list.length === 0
                ? "Empty"
                : `${list.filter((n) => !n.read).length} unread · ${list.length} total`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {hasUnread && (
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

        {list.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 py-10">
            <div className="text-center">
              <span className="mx-auto mb-3 inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                <IconBell size={18} stroke={1.5} />
              </span>
              <p className="text-sm text-muted-foreground">
                No notifications yet
              </p>
            </div>
          </div>
        ) : (
          <ul role="list" className="flex-1 divide-y divide-border overflow-y-auto">
            {list.map((n) => (
              <NotificationRow key={n.id} item={n} onClick={() => onClick(n)} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function NotificationRow({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const tone = KIND_TONE[item.kind];

  return (
    <li>
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
    </li>
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

      <p className="text-xs text-muted-foreground">
        Deep-link actions (open in chat / view trade) wire up in iteration 7.
      </p>
    </div>
  );
}
