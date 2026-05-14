"use client";

import { IconBell } from "@tabler/icons-react";

export function NotificationBell({ unread = 0 }: { unread?: number }) {
  return (
    <button
      type="button"
      aria-label={
        unread > 0
          ? `Notifications, ${unread} unread`
          : "Notifications"
      }
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
  );
}
