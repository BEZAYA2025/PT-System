"use client";

import { useEffect, useState } from "react";
import { IconLockSquare, IconLogout } from "@tabler/icons-react";

interface ImpersonationMeta {
  member_id?: string | null;
  member_name?: string | null;
  member_email?: string | null;
  expires_at?: string | null;
  started_at?: string | null;
}

function readMeta(): ImpersonationMeta | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("impersonation_meta="));
  if (!raw) return null;
  try {
    const value = decodeURIComponent(raw.slice("impersonation_meta=".length));
    return JSON.parse(value) as ImpersonationMeta;
  } catch {
    return null;
  }
}

function formatLeft(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "—";
  const t = Date.parse(expiresAt);
  if (!Number.isFinite(t)) return "—";
  const ms = t - Date.now();
  if (ms <= 0) return "expired";
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m left`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m left`;
}

// Sticky amber banner shown on every page while an impersonation is
// active. Reads the impersonation_meta cookie (set by the proxy on
// successful /impersonate, deleted on /exit).
export function ImpersonationBanner() {
  const [meta, setMeta] = useState<ImpersonationMeta | null>(null);
  const [tick, setTick] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    setMeta(readMeta());
    // Cheap 30s tick so the countdown updates without external state.
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  // Re-read on every tick — the cookie may have been cleared by an
  // exit from a different tab.
  useEffect(() => {
    const fresh = readMeta();
    setMeta(fresh);
  }, [tick]);

  if (!meta) return null;

  const label =
    meta.member_name ?? meta.member_email ?? meta.member_id ?? "member";
  const left = formatLeft(meta.expires_at);

  const handleExit = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await fetch("/api/proxy/admin/impersonation/exit", {
        method: "POST",
      });
    } catch {
      // ignore — the cookies are cleared regardless
    } finally {
      // Hard navigation back to the member detail so requireUser
      // re-runs with the restored founder token.
      const target = meta.member_id
        ? `/admin/members/${meta.member_id}`
        : "/admin/members";
      window.location.href = target;
    }
  };

  // NOT sticky — the dashboard and admin layouts both have their
  // own `sticky top-0` chrome (DashboardHeader / AdminShell mobile
  // bar / member-detail tab nav). Stacking a second sticky on top
  // either covers the chrome or requires per-layout `top` offsets.
  // Banner sits in normal flow at the top of the page; the loud
  // amber colour keeps it noticeable on first paint, and every
  // route change re-paints it via the layout.
  return (
    <div
      role="alert"
      className="border-b border-amber-500/40 bg-amber-500/[0.10] text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm sm:px-6 md:px-8">
        <span className="inline-flex items-center gap-2 font-medium">
          <IconLockSquare size={14} stroke={2} aria-hidden />
          IMPERSONATING:{" "}
          <span className="font-semibold text-amber-100">{label}</span>
          <span className="font-mono text-[11px] text-amber-200/80">
            · {left}
          </span>
        </span>
        <button
          type="button"
          onClick={handleExit}
          disabled={exiting}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.18] px-3 text-xs font-semibold text-amber-100 hover:bg-amber-500/[0.28] disabled:opacity-60"
        >
          <IconLogout size={12} stroke={1.75} aria-hidden />
          {exiting ? "Exiting…" : "Exit impersonation"}
        </button>
      </div>
    </div>
  );
}
