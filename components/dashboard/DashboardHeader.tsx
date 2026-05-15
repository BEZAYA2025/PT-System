"use client";

import Link from "next/link";
import { useState } from "react";
import {
  IconLogout,
  IconMenu2,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
// IconSettings retained for the mobile drawer; the desktop gear icon was
// removed in Round 11 since it duplicates the user-pill dropdown entry.
import { NotificationCenter } from "./NotificationCenter";
import { BrandLogo } from "./BrandLogo";
import { ConnectionStatusPill } from "./ConnectionStatusPill";
import { UserPill } from "./UserPill";
import type { NotificationItem } from "@/lib/notifications";

interface Props {
  displayName: string;
  email: string;
  tier: string | null | undefined;
  notifications: NotificationItem[];
  unreadCount: number;
}

export function DashboardHeader({
  displayName,
  email,
  tier,
  notifications,
  unreadCount,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {/* Brand: triangle logo + wordmark + Live pill — clicking inside
            the cockpit should keep you in the cockpit (Round 11). */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            aria-label="PT System dashboard"
            data-tour="brand"
            className="flex items-center gap-2"
          >
            <BrandLogo size={18} />
            <span className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
              PT System
            </span>
            <ConnectionStatusPill />
          </Link>
        </div>

        {/* Desktop right cluster — bell + user pill (Settings reachable
            via the user-pill dropdown; the standalone gear icon was
            redundant and removed in Round 11). */}
        <div className="hidden items-center gap-2 sm:flex">
          <NotificationCenter
            initial={notifications}
            initialUnreadCount={unreadCount}
          />
          <UserPill
            displayName={displayName}
            email={email}
            tier={tier}
          />
        </div>

        {/* Mobile right cluster — bell + drawer toggle */}
        <div className="flex items-center gap-2 sm:hidden">
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
