"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
} from "@/lib/ui";

// Round-22c: segment-level error boundary for /dashboard/settings.
// Mirrors the dashboard root boundary added in Round-16; without this,
// a render error in any settings card escalates to the parent
// /dashboard boundary, which dumps the whole cockpit. Catching at the
// settings segment keeps the rest of the cockpit intact and gives the
// member a targeted retry path.

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[settings:error-boundary]", error);
  }, [error]);

  return (
    <main id="main" className="px-4 py-16 sm:px-6">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-6 text-center shadow-[0_4px_24px_-12px_rgba(0,0,0,0.4)] sm:p-8">
        <span className="inline-flex size-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/[0.08] text-amber-300">
          <IconAlertTriangle size={22} stroke={1.75} aria-hidden />
        </span>

        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Settings hit a render error
          </h1>
          <p className="text-sm text-muted-foreground">
            One of the settings cards tripped. Try again — your data is
            safe, the failure is contained to this page.
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
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
