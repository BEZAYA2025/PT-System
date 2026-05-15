"use client";

import { useEffect, useState } from "react";

// Round-22a: replaces the hardcoded "Live" pill in DashboardHeader with
// a state-aware version that reflects the actual connectivity.
//
//   online + SSE healthy   → emerald "Live" (pulsing dot)
//   online + SSE silent    → amber   "Reconnecting" (no pulse)
//   browser offline        → muted   "Offline" (static dot)
//
// Two signals feed the state:
//   1. `navigator.onLine` + `online` / `offline` window events
//   2. `pt-system:sse-state` custom event dispatched by the chat hook
//      whenever its EventSource opens or errors out (Round-22a).
//
// The component is intentionally lightweight — no context provider,
// no SWR. The chat hook is mounted on every dashboard route so the
// custom-event channel is always live.

type Status = "live" | "reconnecting" | "offline";

interface SseStateDetail {
  connected: boolean;
}

export function ConnectionStatusPill() {
  // Server pass renders "live" — the optimistic state. After mount
  // the effect below corrects it from the real signals so SSR + client
  // first paint match (no hydration mismatch). `suppressHydrationWarning`
  // on the label-text covers the brief moment between mount and the
  // first sse-state event.
  const [status, setStatus] = useState<Status>("live");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const recompute = (sseConnected: boolean | null) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        return;
      }
      if (sseConnected === false) {
        setStatus("reconnecting");
        return;
      }
      setStatus("live");
    };

    // Initial read — assume SSE is up until the chat hook tells us
    // otherwise. The hook fires the event on every state change.
    recompute(true);

    const onOnline = () => recompute(true);
    const onOffline = () => recompute(false);
    const onSseState = (ev: Event) => {
      const detail = (ev as CustomEvent<SseStateDetail>).detail;
      recompute(detail?.connected ?? null);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pt-system:sse-state", onSseState);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pt-system:sse-state", onSseState);
    };
  }, []);

  const tone =
    status === "live"
      ? {
          wrapper: "border-emerald/30 bg-emerald/[0.06] text-emerald",
          dot: "bg-emerald",
          pulse: true,
        }
      : status === "reconnecting"
        ? {
            wrapper: "border-amber-500/30 bg-amber-500/[0.06] text-amber-300",
            dot: "bg-amber-300",
            pulse: false,
          }
        : {
            wrapper: "border-border bg-surface text-muted-foreground",
            dot: "bg-muted-foreground",
            pulse: false,
          };
  const label =
    status === "live"
      ? "Live"
      : status === "reconnecting"
        ? "Reconnecting"
        : "Offline";

  return (
    <span
      className={`ml-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.wrapper}`}
      role="status"
      aria-live="polite"
      aria-label={`Connection: ${label}`}
    >
      <span aria-hidden className="relative flex size-1.5">
        {tone.pulse && (
          <span
            className={`absolute inset-0 animate-ping rounded-full opacity-60 ${tone.dot}`}
            style={{ animationDuration: "2s" }}
          />
        )}
        <span
          className={`relative inline-flex size-1.5 rounded-full ${tone.dot}`}
        />
      </span>
      <span suppressHydrationWarning>{label}</span>
    </span>
  );
}
