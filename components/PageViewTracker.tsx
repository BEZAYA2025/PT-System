"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

// Inner component reads useSearchParams — per Next.js docs, any
// client component using that hook must sit inside a Suspense
// boundary so the rest of the tree can still prerender. The outer
// PageViewTracker provides the boundary so callers don't have to.

function PageViewTrackerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  useEffect(() => {
    const path = qs ? `${pathname}?${qs}` : pathname;
    track("page_view", {
      path,
      referrer:
        typeof document !== "undefined" ? document.referrer || null : null,
    });
  }, [pathname, qs]);

  return null;
}

export function PageViewTracker() {
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner />
    </Suspense>
  );
}
