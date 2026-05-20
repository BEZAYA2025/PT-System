"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconActivity,
  IconAdjustments,
  IconBrain,
  IconChartCandle,
  IconChartLine,
  IconClipboardCheck,
  IconClipboardList,
  IconLayoutDashboard,
  IconLogout,
  IconMail,
  IconShield,
  IconTicket,
  IconUsers,
} from "@tabler/icons-react";
import { BrandLogo } from "@/components/dashboard/BrandLogo";

const ACTIVE_LINKS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
}> = [
  { href: "/admin", label: "Overview", icon: IconLayoutDashboard },
  { href: "/admin/briefings", label: "Briefings", icon: IconClipboardCheck },
  { href: "/admin/members", label: "Members", icon: IconUsers },
  { href: "/admin/aven", label: "Aven Insights", icon: IconBrain },
  { href: "/admin/business", label: "Business", icon: IconChartLine },
  { href: "/admin/system", label: "System", icon: IconActivity },
  { href: "/admin/configurations", label: "Configurations", icon: IconAdjustments },
  { href: "/admin/communications", label: "Communications", icon: IconMail },
  { href: "/admin/trading", label: "Trading", icon: IconChartCandle },
  { href: "/admin/discount-codes", label: "Discount Codes", icon: IconTicket },
  { href: "/admin/audit", label: "Audit Log", icon: IconClipboardList },
];

const COMING_SOON: Array<{
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
}> = [];

interface Props {
  displayName: string;
  onNavigate?: () => void;
}

export function AdminSidebar({ displayName, onNavigate }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const handleSignOut = async () => {
    try {
      await fetch("/api/proxy/auth/signout", { method: "POST" });
    } finally {
      window.location.href = "/signin";
    }
  };

  return (
    <aside
      aria-label="Admin navigation"
      className="flex h-full w-60 flex-col border-r border-border bg-[#070707]"
    >
      <div className="border-b border-border px-5 py-5">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="inline-flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-emerald rounded-md"
          aria-label="PT System admin"
        >
          <BrandLogo size={18} />
          <span className="font-semibold tracking-tight text-foreground">
            PT System
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/[0.08] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
            <IconShield size={10} stroke={2} aria-hidden />
            Admin
          </span>
        </Link>
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {ACTIVE_LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-emerald/[0.10] text-emerald"
                      : "text-foreground/80 hover:bg-surface hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon
                    size={16}
                    stroke={active ? 2 : 1.75}
                  />
                  <span className="font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {COMING_SOON.length > 0 && (
          <>
            <p className="mt-6 px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Coming soon
            </p>
            <ul className="mt-2 space-y-0.5">
              {COMING_SOON.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <span
                    aria-disabled
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/50"
                  >
                    <Icon size={16} stroke={1.5} />
                    <span className="flex-1 truncate">{label}</span>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                      Soon
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-surface/60 px-3 py-2.5">
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald/[0.14] font-mono text-[11px] font-semibold uppercase text-emerald"
          >
            {displayName.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">
              {displayName}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-wider text-emerald/80">
              Founder
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-2 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <IconLogout size={14} stroke={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
