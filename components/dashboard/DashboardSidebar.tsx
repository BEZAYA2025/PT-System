"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings } from "lucide-react";
import { SignOutButton } from "./SignOutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname() ?? "/dashboard";

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r border-border bg-surface px-5 py-8 lg:flex lg:flex-col">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          PT System
        </Link>

        <nav className="mt-10 flex flex-1 flex-col gap-1" aria-label="Cockpit">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface-elevated text-foreground"
                    : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                ].join(" ")}
              >
                <Icon aria-hidden className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border pt-6">
          <SignOutButton />
        </div>
      </aside>

      {/* Mobile bottom-nav */}
      <nav
        aria-label="Cockpit"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-border bg-background lg:hidden"
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon aria-hidden className="size-5" />
              {item.label}
            </Link>
          );
        })}
        <div className="flex flex-1 items-center justify-center">
          <SignOutButton
            label="Sign out"
            className="flex flex-col items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          />
        </div>
      </nav>
    </>
  );
}
