"use client";

import { useEffect } from "react";
import Link from "next/link";
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
} from "@/lib/ui";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[admin:error-boundary]", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-6 text-center shadow-[0_4px_24px_-12px_rgba(0,0,0,0.4)] sm:p-8">
      <span className="inline-flex size-12 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/[0.08] text-amber-300">
        <IconAlertTriangle size={22} stroke={1.75} aria-hidden />
      </span>

      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Something glitched on the admin panel
        </h1>
        <p className="text-sm text-muted-foreground">
          A render error hit this view. Try again — most of the time
          this clears with a single reload.
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
          href="/admin"
          className={`${buttonSecondaryClasses} h-10 px-5 text-sm`}
        >
          Reload admin
        </Link>
      </div>
    </div>
  );
}
