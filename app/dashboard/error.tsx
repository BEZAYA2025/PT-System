"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
} from "@/lib/ui";

// Round-16: graceful fallback for /dashboard route segment.
// Next.js App-Router error boundary — wraps every page under
// /dashboard. If a child component throws (including a hydration
// mismatch escalation), the member sees this card instead of a
// blank page or React's red overlay. `reset()` re-renders the
// segment so a transient blip auto-clears with a single click.

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep noisy errors visible in production browser-dev tools.
    // eslint-disable-next-line no-console
    console.error("[dashboard:error-boundary]", error);
  }, [error]);

  return (
    <main
      id="main"
      className="px-4 py-16 sm:px-6"
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-6 text-center shadow-[0_4px_24px_-12px_rgba(0,0,0,0.4)] sm:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/[0.08] text-amber-300">
          <IconAlertTriangle size={22} stroke={1.75} aria-hidden />
        </span>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Something glitched on the cockpit
          </h1>
          <p className="text-sm text-muted-foreground">
            The dashboard tripped on a render error. Try again — most of
            the time this clears with a single reload.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
              ref · {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => reset()}
            className={`${buttonPrimaryClasses} h-10 px-5 text-sm`}
          >
            <IconRefresh size={14} stroke={2} className="mr-1.5" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className={`${buttonSecondaryClasses} h-10 px-5 text-sm`}
          >
            Reload dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
