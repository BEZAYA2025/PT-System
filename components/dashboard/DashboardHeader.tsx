"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  IconArrowLeft,
  IconSettings,
  IconMenu2,
  IconX,
  IconLogout,
} from "@tabler/icons-react";
import { NotificationCenter } from "./NotificationCenter";
import { BtcPricePill } from "./BtcPricePill";
import type { NotificationItem } from "@/lib/notifications";
import type { BtcPriceView } from "@/lib/metrics";

interface Props {
  displayName: string;
  email: string;
  notifications: NotificationItem[];
  unreadCount: number;
  initialBtcPrice: BtcPriceView | null;
}

export function DashboardHeader({
  displayName,
  email,
  notifications,
  unreadCount,
  initialBtcPrice,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? "/dashboard";
  // Sub-pages under /dashboard get a back-to-dashboard affordance both in
  // the desktop cluster and the mobile header.
  const isSubPage =
    pathname.startsWith("/dashboard/") && pathname !== "/dashboard";

  const handleSignOut = async () => {
    try {
      await fetch("/api/proxy/auth/signout", { method: "POST" });
    } finally {
      window.location.href = "/signin";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Brand + live + BTC price */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            data-tour="brand"
            className="flex items-center gap-3"
          >
            <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              PT System
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
              <span aria-hidden className="relative flex size-1.5">
                <span
                  className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
                  style={{ animationDuration: "2s" }}
                />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald" />
              </span>
              Live
            </span>
          </Link>
          <BtcPricePill initial={initialBtcPrice} />
        </div>

        {/* Desktop right cluster */}
        <div className="hidden items-center gap-2 sm:flex">
          {isSubPage && (
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <IconArrowLeft size={14} stroke={1.75} />
              Dashboard
            </Link>
          )}
          <span className="hidden text-sm text-muted-foreground md:inline">
            {displayName}
          </span>
          <NotificationCenter
            initial={notifications}
            initialUnreadCount={unreadCount}
          />
          <Link
            href="/dashboard/settings"
            aria-label="Settings"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <IconSettings size={18} stroke={1.75} />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <IconLogout size={18} stroke={1.75} />
          </button>
        </div>

        {/* Mobile right cluster — bell stays accessible */}
        <div className="flex items-center gap-2 sm:hidden">
          {isSubPage && (
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <IconArrowLeft size={18} stroke={1.75} />
            </Link>
          )}
          <NotificationCenter
            initial={notifications}
            initialUnreadCount={unreadCount}
          />
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground"
          >
            {mobileOpen ? (
              <IconX size={18} stroke={1.75} />
            ) : (
              <IconMenu2 size={18} stroke={1.75} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border bg-surface px-4 py-4 sm:hidden">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Signed in as
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {displayName}
          </p>
          <p className="text-xs text-muted-foreground">{email}</p>
          <div className="mt-4 grid gap-2">
            <Link
              href="/dashboard/settings"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <IconSettings size={16} stroke={1.75} />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <IconLogout size={16} stroke={1.75} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
