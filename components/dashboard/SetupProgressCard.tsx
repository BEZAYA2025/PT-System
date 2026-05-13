"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Sparkles } from "lucide-react";
import {
  buttonPrimaryClasses,
  cardClasses,
} from "@/lib/ui";
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
  displayName: string | null;
}

type ModalKind = "telegram" | "exchange" | null;

export function SetupProgressCard({
  steps,
  initiallyDismissed,
  displayName,
}: Props) {
  const router = useRouter();
  const [openModal, setOpenModal] = useState<ModalKind>(null);
  const [dismissed, setDismissed] = useState(initiallyDismissed);
  const [dismissing, setDismissing] = useState(false);

  const completedCount = steps.filter((s) => s.complete).length;
  const total = steps.length;
  const allComplete = completedCount === total;

  // Hide the banner once setup is complete or the member dismissed it.
  if (dismissed || allComplete) return null;

  const pct = Math.round((completedCount / total) * 100);
  const firstActionable = steps.find((s) => !s.complete && s.actionable);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await fetch("/api/setup/dismiss", { method: "POST" });
      setDismissed(true);
      router.refresh();
    } catch {
      // Even if the cookie call fails, hide locally — non-critical UX.
      setDismissed(true);
    } finally {
      setDismissing(false);
    }
  };

  const handleStepClick = (kind: SetupStepKind) => {
    if (kind === "telegram") setOpenModal("telegram");
    else if (kind === "exchange") setOpenModal("exchange");
  };

  const greeting = displayName
    ? `Welcome aboard, ${displayName}.`
    : "Welcome aboard.";

  return (
    <>
      <section
        aria-label="Account setup progress"
        className={`${cardClasses} relative`}
      >
        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          aria-label="Dismiss setup banner"
          className="absolute right-3 top-3 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground disabled:opacity-60"
        >
          <X aria-hidden className="size-4" />
        </button>

        <div className="flex items-start gap-3 pr-10">
          <span
            aria-hidden
            className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.08] text-emerald"
          >
            <Sparkles strokeWidth={1.75} className="size-4" />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {greeting}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A couple of quick steps and Aven is wired up to your trading.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Account setup
            </p>
            <p className="font-mono text-xs text-foreground">
              {completedCount} of {total} complete
            </p>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={completedCount}
            aria-label="Setup progress"
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
          >
            <div
              className="h-full bg-emerald transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <ul className="mt-6 space-y-2">
          {steps.map((step) => (
            <li
              key={step.kind}
              className={[
                "flex items-center gap-3 rounded-lg border px-4 py-3",
                step.complete
                  ? "border-emerald/20 bg-emerald/[0.03]"
                  : "border-border bg-surface/30",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
                  step.complete
                    ? "border-emerald bg-emerald text-background"
                    : "border-border bg-surface text-muted-foreground",
                ].join(" ")}
              >
                {step.complete && <Check strokeWidth={2.5} className="size-3.5" />}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={[
                    "text-sm",
                    step.complete
                      ? "text-muted-foreground line-through decoration-muted-foreground/40"
                      : "text-foreground",
                  ].join(" ")}
                >
                  {step.label}
                </p>
                {!step.complete && step.helper && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.helper}
                  </p>
                )}
              </div>
              {!step.complete && step.actionable && (
                <button
                  type="button"
                  onClick={() => handleStepClick(step.kind)}
                  className="shrink-0 text-xs font-medium text-emerald transition-colors hover:text-emerald-hover"
                >
                  Connect →
                </button>
              )}
            </li>
          ))}
        </ul>

        {firstActionable && (
          <button
            type="button"
            onClick={() => handleStepClick(firstActionable.kind)}
            className={`${buttonPrimaryClasses} mt-6 w-full sm:w-auto`}
          >
            Complete setup
          </button>
        )}
      </section>

      <ConnectTelegramModal
        open={openModal === "telegram"}
        onClose={() => setOpenModal(null)}
      />
      <ConnectExchangeModal
        open={openModal === "exchange"}
        onClose={() => setOpenModal(null)}
      />
    </>
  );
}
