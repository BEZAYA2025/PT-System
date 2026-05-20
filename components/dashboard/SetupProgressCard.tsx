"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconChevronRight, IconCircle } from "@tabler/icons-react";
import { Toast, type ToastState } from "@/components/Toast";
import { cardClasses } from "@/lib/ui";
import { track } from "@/lib/track";
import { ConnectTelegramModal } from "./ConnectTelegramModal";
import { ConnectExchangeModal } from "./ConnectExchangeModal";

export type SetupStepKind =
  | "account"
  | "email"
  | "subscription"
  | "telegram"
  | "exchange";

export interface SetupStep {
  kind: SetupStepKind;
  label: string;
  helper?: string;
  complete: boolean;
  /** Set only for kinds the user can act on from this card. */
  actionable: boolean;
}

interface Props {
  steps: SetupStep[];
  initiallyDismissed: boolean;
}

type ModalKind = "telegram" | "exchange" | null;

const CELEBRATED_KEY = "pt_setup_celebrated";

export function SetupProgressCard({
  steps,
  initiallyDismissed,
}: Props) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<ModalKind>(null);
  const [dismissed, setDismissed] = useState(initiallyDismissed);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const celebratedRef = useRef(false);

  const completedCount = steps.filter((s) => s.complete).length;
  const total = steps.length;
  const allComplete = completedCount === total;
  const pct = Math.round((completedCount / total) * 100);

  // Fire the "All set!" toast exactly once per browser — the moment the
  // member completes the final step. localStorage flag survives reloads
  // so they don't see the celebration on every subsequent dashboard
  // visit. Refs guard against the effect firing twice in StrictMode.
  useEffect(() => {
    if (!allComplete || celebratedRef.current) return;
    let already = false;
    try {
      already = localStorage.getItem(CELEBRATED_KEY) === "true";
    } catch {
      // ignore storage failure
    }
    if (already) return;
    celebratedRef.current = true;
    setToast({ message: "All set! Enjoy PT System.", tone: "success" });
    try {
      localStorage.setItem(CELEBRATED_KEY, "true");
    } catch {
      // ignore
    }
  }, [allComplete]);

  const handleDismiss = async () => {
    if (busy) return;
    setBusy(true);
    setDismissed(true);
    // Best-effort: backend persists across devices, cookie persists for
    // this browser. Either one being honoured is enough to keep the
    // card collapsed on next load.
    await Promise.allSettled([
      fetch("/api/proxy/auth/setup-progress-dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
      fetch("/api/setup/dismiss", { method: "POST" }),
    ]);
    setBusy(false);
    router.refresh();
  };

  const handleReExpand = () => {
    setDismissed(false);
  };

  const handleStepClick = (kind: SetupStepKind) => {
    track("setup_click", { step: kind });
    if (kind === "telegram") setOpenModal("telegram");
    else if (kind === "exchange") setOpenModal("exchange");
  };

  // Card gone — but the "All set!" toast may still be rendering.
  if (allComplete) {
    return <Toast value={toast} onDismiss={() => setToast(null)} />;
  }

  // Collapsed banner — the member chose "I'll do this later" but
  // the steps aren't all done yet. Tiny strip with a re-expand action
  // so they can resume any time without digging through Settings.
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={handleReExpand}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition-colors hover:border-emerald/40 hover:bg-emerald/[0.04]"
      >
        <span className="flex items-center gap-3">
          <span
            aria-hidden
            className="inline-flex size-7 items-center justify-center rounded-full bg-emerald/[0.12] font-mono text-[11px] font-semibold text-emerald"
          >
            {completedCount}/{total}
          </span>
          <span className="font-medium text-foreground">
            Finish setup
          </span>
          <span className="hidden text-muted-foreground sm:inline">
            · {total - completedCount} step{total - completedCount === 1 ? "" : "s"} left
          </span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald">
          Resume
          <IconChevronRight size={14} stroke={2} aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <>
      <section
        aria-label="Account setup progress"
        className={`${cardClasses} relative`}
      >
        <header>
          <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Get the most out of PT System
          </h2>
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              {completedCount} of {total} complete
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {pct}%
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completedCount}
            aria-label="Setup progress"
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated"
          >
            <div
              className="h-full bg-emerald transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </header>

        <ul className="mt-6 space-y-2.5">
          {steps.map((step) => (
            <li
              key={step.kind}
              className={[
                "flex items-center gap-3 rounded-xl border px-4 py-3.5",
                step.complete
                  ? "border-emerald/20 bg-emerald/[0.03]"
                  : "border-border bg-background",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                  step.complete
                    ? "bg-emerald text-background"
                    : "border border-border text-muted-foreground",
                ].join(" ")}
              >
                {step.complete ? (
                  <IconCheck size={14} stroke={2.5} />
                ) : (
                  <IconCircle size={12} stroke={1.75} />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "text-sm font-medium",
                    step.complete ? "text-foreground/80" : "text-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                {step.helper && (
                  <p
                    className={[
                      "mt-0.5 text-xs",
                      step.complete && step.helper === "Done"
                        ? "text-emerald/80"
                        : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {step.helper}
                  </p>
                )}
              </div>

              {!step.complete && step.actionable && (
                <button
                  type="button"
                  onClick={() => handleStepClick(step.kind)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald/40 bg-emerald/[0.08] px-3 py-1.5 text-xs font-semibold text-emerald transition-colors hover:bg-emerald/[0.14]"
                >
                  Connect
                  <IconChevronRight size={12} stroke={2} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            I&apos;ll do this later →
          </button>
        </div>
      </section>

      <ConnectTelegramModal
        open={openModal === "telegram"}
        onClose={() => setOpenModal(null)}
      />
      <ConnectExchangeModal
        open={openModal === "exchange"}
        onClose={() => setOpenModal(null)}
      />

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
