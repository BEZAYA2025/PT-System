"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Monkey-patches window.fetch once per page-load so any 401 from our
// own /api/* proxy routes triggers a single silent refresh, retries
// the request, and only THEN bounces to /signin when the refresh
// itself fails. Pre-LOGIN-4 the interceptor bounced on the first 401
// with no retry — a single transient expiry mid-session yanked the
// user out without warning. The flow now is:
//
//   request → 401 → POST /api/proxy/auth/refresh
//     ok       → retry original request, return whatever it gives
//     non-ok   → bounce to /signin?next=<current>
//
// Idempotent install at the module level; the cleanup is a no-op
// because reverting on unmount would race with in-flight requests.

let installed = false;
let inFlightRefresh: Promise<boolean> | null = null;

// Auth flows themselves must skip the refresh-then-retry detour: a
// 401 from /signin is "wrong password" (don't refresh), a 401 from
// /refresh is the refresh token itself failing (don't recurse), etc.
const AUTH_FLOW_RE = /\/api\/proxy\/auth\//i;
const OUR_API_RE = /^(\/api\/|https?:\/\/[^/]+\/api\/)/i;

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  if (input instanceof Request) return input.url;
  return "";
}

async function attemptRefresh(): Promise<boolean> {
  if (inFlightRefresh) return inFlightRefresh;
  inFlightRefresh = (async () => {
    try {
      const res = await fetch("/api/proxy/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Hold the deduped promise for one tick so concurrent 401s on
      // the same expiry batch reuse this single refresh, then clear
      // so a later (next-expiry) batch can refresh again.
      setTimeout(() => {
        inFlightRefresh = null;
      }, 1000);
    }
  })();
  return inFlightRefresh;
}

export function FetchAuthInterceptor() {
  const pathname = usePathname();

  useEffect(() => {
    if (installed || typeof window === "undefined") return;
    installed = true;
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      let res = await original(input, init);
      try {
        if (res.status !== 401) return res;
        const url = urlOf(input);
        // Only react to our own proxy paths so a public-API 401
        // (e.g. a third-party fetch) never bounces the user.
        if (!OUR_API_RE.test(url)) return res;
        // Auth-flow endpoints handle their own 401 UX — don't
        // refresh on a wrong-password attempt, don't recurse on a
        // failed refresh.
        if (AUTH_FLOW_RE.test(url)) return res;

        // First defence: try a silent token refresh. If it succeeds
        // the original request gets a single retry with the fresh
        // access_token cookie.
        const refreshed = await attemptRefresh();
        if (refreshed) {
          res = await original(input, init);
          if (res.status !== 401) return res;
        }

        // Refresh failed OR the retry still 401'd → user is genuinely
        // logged out. Bounce them to /signin with the current path so
        // we land them back where they were after re-auth.
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
