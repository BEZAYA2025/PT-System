"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

// Round-30: mobile nav for the landing pages. Renders a hamburger
// button on small screens; tapping it opens a full-screen sheet with
// the same primary nav items the desktop bar shows, stacked
// vertically. The sheet closes on link tap, on the X button, and on
// Escape. Body scroll is locked while open.

export function SiteHeaderMobileMenu({ isAuthed }: { isAuthed: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="site-header-mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
      >
        {open ? (
          <IconX size={20} stroke={1.75} />
        ) : (
          <IconMenu2 size={20} stroke={1.75} />
        )}
      </button>

      {open && (
        <div
          id="site-header-mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Primary navigation"
          className="fixed inset-0 top-14 z-50 flex flex-col gap-4 border-t border-border bg-background px-6 py-8"
        >
          {isAuthed ? (
            <>
              <SignOutButton
                label="Sign out"
                className="inline-flex w-full items-center rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface disabled:opacity-60"
              />
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-emerald px-6 py-3 text-base font-medium text-background transition-colors hover:bg-emerald-hover"
              >
                Open Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 text-base font-medium text-foreground transition-colors hover:bg-surface"
              >
                Sign in
              </Link>
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full bg-emerald px-6 py-3 text-base font-medium text-background transition-colors hover:bg-emerald-hover"
              >
                Start free trial
              </Link>
            </>
          )}
        </div>
      )}
    </>
  );
}
