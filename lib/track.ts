// Browser-only activity tracker. POSTs to /api/proxy/track which
// forwards to the backend's /api/track endpoint. Designed to be
// fire-and-forget — failures are silently swallowed so a flaky
// analytics pipe never blocks the user's flow.
//
// Session ID lives in localStorage so it persists across reloads
// and tabs. Reset only happens on signout (analytics dashboards
// can then correlate session → user once we wire the link).

const STORAGE_KEY = "pt_session_id";

function uuid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // RFC4122 v4 fallback for older browsers / non-secure contexts.
  // Math.random isn't cryptographically strong but for an opaque
  // session marker it's adequate.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = uuid();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Private mode or storage blocked — fall back to a per-call id
    // so the upstream still gets *something*. No persistence.
    return uuid();
  }
}

export function resetSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Fire-and-forget track call. Returns void; failures are logged at
 * debug level and never thrown. Use it inside effects or click
 * handlers without await.
 */
export function track(
  event_type: string,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  const session_id = getSessionId();
  const body = JSON.stringify({
    event_type,
    session_id,
    payload: payload ?? {},
    client_timestamp: new Date().toISOString(),
  });
  // navigator.sendBeacon survives page-unload (good for last
  // page_view before nav). Falls back to fetch if unavailable.
  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/proxy/track", blob);
      if (ok) return;
    }
  } catch {
    // ignore — fall through to fetch
  }
  void fetch("/api/proxy/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
    cache: "no-store",
  }).catch(() => {
    // silent
  });
}
