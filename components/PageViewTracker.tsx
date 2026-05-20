"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { track } from "@/lib/track";

// Embed once per layout. Fires a `page_view` event on every route
// change (pathname + search params). Renders nothing.
export function PageViewTracker() {
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
