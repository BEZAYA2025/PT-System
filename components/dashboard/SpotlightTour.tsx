"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconArrowLeft, IconArrowRight, IconX } from "@tabler/icons-react";
import { TOUR_STEPS, type TourStep } from "@/lib/tour-config";

const SPOTLIGHT_PADDING = 10;
const TOOLTIP_GAP = 16;
const TOOLTIP_WIDTH = 340;
const SCROLL_SETTLE_MS = 380;
const Z = 100;

interface MeasuredRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  displayName: string | null;
}

export function SpotlightTour({ displayName }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<MeasuredRect | null>(null);
  const [closed, setClosed] = useState(false);
  const [completing, setCompleting] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step: TourStep | undefined = TOUR_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === TOUR_STEPS.length - 1;

  const safeName = displayName?.trim() || "baba";
  const title = step ? step.title.replace("{name}", safeName) : "";

  // ---------------------------------------------------------------------------
  // Target measurement
  // ---------------------------------------------------------------------------

  const measureTarget = useCallback(
    (selector: string | null, scrollFirst: boolean) => {
      if (!selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) {
        // No target found — centre the tooltip rather than break.
        setRect(null);
        return;
      }
      if (scrollFirst) {
        try {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          el.scrollIntoView();
        }
      }
      const apply = () => {
        const r = el.getBoundingClientRect();
        setRect({
          top: r.top - SPOTLIGHT_PADDING,
          left: r.left - SPOTLIGHT_PADDING,
          width: r.width + SPOTLIGHT_PADDING * 2,
          height: r.height + SPOTLIGHT_PADDING * 2,
        });
      };
      if (scrollFirst) {
        window.setTimeout(apply, SCROLL_SETTLE_MS);
      } else {
        apply();
      }
    },
    [],
  );

  // Re-measure on step change (with smooth scroll)
  useEffect(() => {
    if (!step) return;
    measureTarget(step.selector, true);
  }, [step, measureTarget]);

  // Re-measure on scroll/resize without re-scrolling
  useEffect(() => {
    if (!step) return;
    const handler = () => measureTarget(step.selector, false);
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, { passive: true });
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler);
    };
  }, [step, measureTarget]);

  // ---------------------------------------------------------------------------
  // Persistence + close
  // ---------------------------------------------------------------------------

  const persistCompletion = useCallback(async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await fetch("/api/proxy/auth/complete-first-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // Silent — if POST fails, tour will simply re-trigger on next page
      // load. State is unchanged on the backend, no harm done.
    }
  }, [completing]);

  const finish = useCallback(() => {
    // Optimistic close — backend POST runs in background.
    setClosed(true);
    void persistCompletion();
  }, [persistCompletion]);

  // ESC = skip
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [finish]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (closed || !step) return null;
  if (typeof document === "undefined") return null;

  const tooltipPos = computeTooltipPosition(rect);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className="fixed inset-0"
      style={{ zIndex: Z }}
      onClick={finish}
    >
      <SpotlightOverlay rect={rect} />

      <div
        ref={tooltipRef}
        className="absolute rounded-2xl border border-border bg-surface-elevated p-5 shadow-2xl"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: tooltipPos.width,
          maxWidth: "calc(100vw - 2rem)",
          transform: tooltipPos.transform,
          zIndex: Z + 1,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={finish}
          aria-label="Close tour"
          className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
        >
          <IconX size={14} stroke={1.75} />
        </button>

        <p className="font-mono text-[10px] uppercase tracking-wider text-emerald">
          Step {stepIdx + 1} of {TOUR_STEPS.length}
        </p>
        <h3
          id="tour-title"
          className="mt-2 text-lg font-semibold tracking-tight text-foreground"
        >
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {step.body}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Skip
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!isFirst && !isLast && (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-foreground/30"
              >
                <IconArrowLeft size={12} stroke={2} />
                Back
              </button>
            )}
            {!isLast ? (
              <button
                type="button"
                onClick={() => setStepIdx((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                className="inline-flex items-center gap-1 rounded-full bg-emerald px-4 py-1.5 text-xs font-medium text-background transition-colors hover:bg-emerald-hover"
              >
                Next
                <IconArrowRight size={12} stroke={2} />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center justify-center rounded-full bg-emerald px-5 py-1.5 text-xs font-medium text-background transition-colors hover:bg-emerald-hover"
              >
                Done
              </button>
            )}
          </div>
        </div>

        <ProgressDots count={TOUR_STEPS.length} active={stepIdx} />
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SpotlightOverlay({ rect }: { rect: MeasuredRect | null }) {
  if (!rect) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 bg-background/85 backdrop-blur-sm"
      />
    );
  }

  const { top, left, width, height } = rect;
  const right = left + width;
  const bottom = top + height;

  return (
    <>
      {/* 4 dark frames around the lit-up target */}
      <div
        aria-hidden
        className="absolute bg-background/85 backdrop-blur-[2px]"
        style={{ top: 0, left: 0, right: 0, height: Math.max(0, top) }}
      />
      <div
        aria-hidden
        className="absolute bg-background/85 backdrop-blur-[2px]"
        style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
      />
      <div
        aria-hidden
        className="absolute bg-background/85 backdrop-blur-[2px]"
        style={{ top, left: 0, width: Math.max(0, left), height }}
      />
      <div
        aria-hidden
        className="absolute bg-background/85 backdrop-blur-[2px]"
        style={{ top, left: right, right: 0, height }}
      />
      {/* Pulsing emerald ring around target */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-xl ring-2 ring-emerald/70 transition-all duration-200"
        style={{
          top,
          left,
          width,
          height,
          boxShadow:
            "0 0 0 4px rgba(16,185,129,0.18), 0 0 28px 4px rgba(16,185,129,0.25)",
        }}
      />
    </>
  );
}

function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={[
            "block size-1.5 rounded-full transition-all",
            i === active
              ? "w-4 bg-emerald"
              : i < active
                ? "bg-emerald/40"
                : "bg-border",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

function computeTooltipPosition(
  rect: MeasuredRect | null,
): {
  top: number | string;
  left: number | string;
  width: number;
  transform?: string;
} {
  const viewportH =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW =
    typeof window !== "undefined" ? window.innerWidth : 1200;

  // No target → centre the tooltip in the viewport.
  if (!rect) {
    const width = Math.min(TOOLTIP_WIDTH, viewportW - 32);
    return {
      top: "50%",
      left: "50%",
      width,
      transform: "translate(-50%, -50%)",
    };
  }

  const width = Math.min(TOOLTIP_WIDTH, viewportW - 32);
  const estimatedHeight = 220;
  const wantsBelow =
    rect.top + rect.height + estimatedHeight + TOOLTIP_GAP < viewportH;

  const top = wantsBelow
    ? rect.top + rect.height + TOOLTIP_GAP
    : Math.max(16, rect.top - estimatedHeight - TOOLTIP_GAP);

  const centerX = rect.left + rect.width / 2;
  const halfTw = width / 2;
  const left = Math.max(
    16,
    Math.min(centerX - halfTw, viewportW - width - 16),
  );

  return { top, left, width };
}
