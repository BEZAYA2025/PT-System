"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconAlertTriangle, IconCheck, IconX } from "@tabler/icons-react";

// Round-13e: lightweight self-contained toast. NOT a global provider —
// each card that wants a confirmation toast owns its own state and
// renders this component. Keeps Round-13's scope honest (no new shared
// context) while still giving Paul the auto-dismiss pill feel.
//
// Usage:
//   const [toast, setToast] = useState<ToastState | null>(null);
//   ...
//   setToast({ message: "Saved.", tone: "success" });
//   ...
//   <Toast value={toast} onDismiss={() => setToast(null)} />

export interface ToastState {
  message: string;
  tone: "success" | "error";
}

interface Props {
  value: ToastState | null;
  onDismiss: () => void;
  /** Optional override of the auto-dismiss timer (ms). 3.2s by default. */
  durationMs?: number;
}

export function Toast({ value, onDismiss, durationMs = 3200 }: Props) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!value) return;
    const id = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(id);
  }, [value, onDismiss, durationMs]);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      // Pointer-events:none on the wrapper so the toast doesn't trap clicks
      // on the bottom of the page; the inner pill re-enables them for the
      // close button only.
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6 sm:justify-end sm:px-6"
    >
      <AnimatePresence>
        {value && (
          <motion.div
            key={value.message}
            initial={reduce ? { opacity: 1 } : { opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            role={value.tone === "error" ? "alert" : "status"}
            className={[
              "pointer-events-auto inline-flex max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.5)] backdrop-blur",
              value.tone === "success"
                ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                : "border-red-500/40 bg-red-500/[0.08] text-red-200",
            ].join(" ")}
          >
            <span
              aria-hidden
              className={[
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                value.tone === "success"
                  ? "bg-emerald/[0.18] text-emerald"
                  : "bg-red-500/[0.18] text-red-200",
              ].join(" ")}
            >
              {value.tone === "success" ? (
                <IconCheck size={12} stroke={2.5} />
              ) : (
                <IconAlertTriangle size={12} stroke={2.25} />
              )}
            </span>
            <p className="flex-1 text-sm font-medium leading-snug">
              {value.message}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-current/70 transition-colors hover:bg-foreground/[0.08]"
            >
              <IconX size={12} stroke={2} aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
