"use client";

import { useEffect, useRef } from "react";

// Round-14d: shared polling loop with Page Visibility pause. Dashboard
// surfaces want to feel live (5s tick on price + trades) but we don't
// want to keep firing requests when the member backgrounds the tab.
//
// Usage:
//   usePolling({ fn: fetchOnce, intervalMs: 5_000 });
//
// `fn` should be wrapped in useCallback so the hook's effect doesn't
// reinstall every render — only `intervalMs`, `enabled`, etc. should
// trigger teardown.

interface Options {
  /** Function fired on each tick. */
  fn: () => void | Promise<void>;
  /** Tick interval in ms. Defaults to 5s (the round-14 cockpit cadence). */
  intervalMs?: number;
  /** Pause the loop while document.visibilityState === "hidden". Default true. */
  pauseWhenHidden?: boolean;
  /** Fire `fn` immediately when the tab becomes visible after being hidden,
   *  so the member doesn't have to wait `intervalMs` for fresh data. */
  refireOnVisible?: boolean;
  /** Set to false to disable the loop entirely (e.g. behind a feature flag). */
  enabled?: boolean;
}

export function usePolling({
  fn,
  intervalMs = 5_000,
  pauseWhenHidden = true,
  refireOnVisible = true,
  enabled = true,
}: Options) {
  // Keep `fn` in a ref so the polling effect doesn't reinstall every
  // render — callers can pass a fresh closure each render without
  // restarting the timer.
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    let timerId: ReturnType<typeof setInterval> | null = null;
    let isHidden =
      pauseWhenHidden && document.visibilityState === "hidden";

    const startTimer = () => {
      if (timerId !== null) return;
      timerId = setInterval(() => {
        if (isHidden) return;
        void fnRef.current();
      }, intervalMs);
    };

    const stopTimer = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    if (!isHidden) startTimer();

    const onVisibility = () => {
      const nowHidden =
        pauseWhenHidden && document.visibilityState === "hidden";
      // Edge — wasn't hidden, now is.
      if (!isHidden && nowHidden) {
        isHidden = true;
        stopTimer();
        return;
      }
      // Edge — was hidden, now visible. Optionally refire then resume.
      if (isHidden && !nowHidden) {
        isHidden = false;
        if (refireOnVisible) void fnRef.current();
        startTimer();
      }
    };

    if (pauseWhenHidden) {
      document.addEventListener("visibilitychange", onVisibility);
    }

    return () => {
      stopTimer();
      if (pauseWhenHidden) {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    };
  }, [intervalMs, pauseWhenHidden, refireOnVisible, enabled]);
}
