"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  IconChevronDown,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";

interface Props {
  displayName: string;
  email: string;
  tier: string | null | undefined;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0][0] ?? "?").toUpperCase();
  return (
    (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "")
  ).toUpperCase();
}

function tierLabel(tier: string | null | undefined): string {
  if (!tier) return "Member";
  const t = tier.toLowerCase();
  if (t === "vip") return "VIP Member";
  if (t === "premium") return "Premium Member";
  return "Member";
}

export function UserPill({ displayName, email, tier }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
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

  const initials = getInitials(displayName);
  const tLabel = tierLabel(tier);
  const isVip = (tier ?? "").toLowerCase() === "vip";

  const handleSignOut = async () => {
    try {
      await fetch("/api/proxy/auth/signout", { method: "POST" });
    } finally {
      window.location.href = "/signin";
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 text-left transition-colors hover:border-foreground/30 sm:pr-3"
      >
        <span
          aria-hidden
          className={[
            "inline-flex size-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
            isVip
              ? "bg-gradient-to-br from-emerald to-emerald-hover text-background shadow-[0_0_16px_-6px_rgba(16,185,129,0.6)]"
              : "bg-emerald/[0.12] text-emerald",
          ].join(" ")}
        >
          {initials}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-medium text-foreground">
            {displayName}
          </span>
          <span
            className={[
              "block font-mono text-[9px] uppercase tracking-[0.12em]",
              isVip ? "text-emerald" : "text-muted-foreground",
            ].join(" ")}
          >
            {tLabel}
          </span>
        </span>
        <IconChevronDown
          size={14}
          stroke={1.75}
          className={[
            "hidden text-muted-foreground transition-transform md:block",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-surface-elevated shadow-2xl"
        >
          <div className="border-b border-border px-3 py-3">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {email}
            </p>
            <p
              className={[
                "mt-1.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider",
                isVip ? "text-emerald" : "text-muted-foreground",
              ].join(" ")}
            >
              {tLabel}
            </p>
          </div>
          <div className="p-1">
            <Link
              href="/dashboard/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface"
            >
              <IconUser size={15} stroke={1.75} aria-hidden />
              Profile &amp; settings
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface"
            >
              <IconLogout size={15} stroke={1.75} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
