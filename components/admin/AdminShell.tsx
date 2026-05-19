"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconMenu2, IconShield, IconX } from "@tabler/icons-react";
import { AdminSidebar } from "./AdminSidebar";

interface Props {
  displayName: string;
  children: React.ReactNode;
}

export function AdminShell({ displayName, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-svh bg-[#0a0a0a]">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-60">
        <AdminSidebar displayName={displayName} />
      </div>

      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-[#070707]/95 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          aria-label="Open admin navigation"
          onClick={() => setMobileOpen(true)}
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground"
        >
          <IconMenu2 size={18} stroke={1.75} />
        </button>
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald">
          <IconShield size={12} stroke={2} aria-hidden />
          Admin
        </span>
        <span className="size-9" aria-hidden />
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-modal="true"
          role="dialog"
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-60">
            <AdminSidebar
              displayName={displayName}
              onNavigate={() => setMobileOpen(false)}
            />
            <button
              type="button"
              aria-label="Close admin navigation"
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              <IconX size={16} stroke={1.75} />
            </button>
          </div>
        </div>
      )}

      <div className="md:pl-60">
        <main
          id="main"
          className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 md:px-8 md:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
