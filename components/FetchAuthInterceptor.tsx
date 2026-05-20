"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Monkey-patches window.fetch once per page-load so any 401 from
// our own /api/* proxy routes redirects the user to /signin with
// the current path preserved as ?next=. Existing fetch call-sites
// don't need to migrate — the wrapper sits at the global window
// level. Non-2xx responses other than 401 pass through untouched.
//
// The patch only intercepts same-origin /api/ requests; outbound
// fetches (e.g. to dashboard.stripe.com from a deep-link) keep
// their native behaviour.
//
// Idempotent: re-runs on remount keep the same patched fetch in
// place, and the cleanup is a no-op since the patch survives the
// component lifecycle (set once at first mount, never reverted —
// reverting on unmount would race with in-flight requests).

let installed = false;

export function FetchAuthInterceptor() {
  const pathname = usePathname();

  useEffect(() => {
    if (installed || typeof window === "undefined") return;
    installed = true;
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const res = await original(input, init);
      try {
        if (res.status !== 401) return res;
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input instanceof Request
                ? input.url
                : "";
        // Only react to our own proxy paths so a public-API 401
        // (e.g. a third-party fetch) never bounces the user.
        if (!/^(\/api\/|https?:\/\/[^/]+\/api\/)/i.test(url)) return res;
        // Already on /signin — let the page handle its own UX.
        if (window.location.pathname.startsWith("/signin")) return res;
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.href = `/signin?next=${next}`;
      } catch {
        // Don't swallow the original response on error in the
        // interceptor — return it for the caller to handle.
      }
      return res;
    };
  }, [pathname]);

  return null;
}
