"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
} from "@tabler/icons-react";
import { AvenAvatar } from "./AvenAvatar";

const LOCAL_STORAGE_KEY = "pt_welcome_seen";

const Z = 110;

interface Slide {
  eyebrow: string;
  titleTemplate: string;
  body: string;
  visual: "default" | "aven" | "brief";
}

const SLIDES: ReadonlyArray<Slide> = [
  {
    eyebrow: "Step 1 of 3",
    titleTemplate: "Welcome to PT System, {name}!",
    body: "You've just joined an AI-powered trading mentorship. Here's what's waiting for you.",
    visual: "default",
  },
  {
    eyebrow: "Step 2 of 3",
    titleTemplate: "Meet Aven, your AI mentor",
    body: "Aven analyzes your trades, scores setups, and coaches you in real time. Ask anything — setup checks, market structure, mid-trade discipline.",
    visual: "aven",
  },
  {
    eyebrow: "Step 3 of 3",
    titleTemplate: "Daily briefings + setup alerts",
    body: "Every morning, you'll get a multi-timeframe Bitcoin briefing. Throughout the day, Aven scans for high-confluence setups and alerts you when something matters.",
    visual: "brief",
  },
];

interface Props {
  displayName: string | null;
  /** Called once the modal closes (either via Get-started CTA or programmatically). */
  onClose: () => void;
}

export function WelcomeModal({ displayName, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [closed, setClosed] = useState(false);

  const safeName = displayName?.trim() || "trader";
  const slide = SLIDES[idx];
  const isFirst = idx === 0;
  const isLast = idx === SLIDES.length - 1;

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);

    // Local-storage hint first — survives a failed backend POST so
    // the modal doesn't re-trigger on every dashboard load during
    // testing while the backend endpoint is still being shipped.
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, "true");
    } catch {
      // ignore — backend flag is the authoritative store anyway
    }

    try {
      await fetch("/api/proxy/auth/onboarding-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      // Silent — non-critical; backend may not have the endpoint yet.
    }

    setClosed(true);
    onClose();
  }, [finishing, onClose]);

  // ESC closes the modal (treats it as a finish — better than trapping
  // the member with no exit when the network is slow). Matches the
  // SpotlightTour escape behaviour.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [finish]);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (closed || typeof document === "undefined") return null;

  const title = slide.titleTemplate.replace("{name}", safeName);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 flex items-center justify-center bg-background/85 px-4 py-8 backdrop-blur-md"
      style={{ zIndex: Z }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-emerald/30 bg-surface-elevated shadow-[0_0_80px_-12px_rgba(16,185,129,0.45),0_24px_60px_-12px_rgba(0,0,0,0.6)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(16,185,129,0.05) 45%, transparent 70%)",
          }}
        />

        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald">
            {slide.eyebrow}
          </p>

          <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <SlideVisual kind={slide.visual} />
            <div className="min-w-0 flex-1">
              <h2
                id="welcome-title"
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              >
                {title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-[17px]">
                {slide.body}
              </p>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className={[
                    "block size-1.5 rounded-full transition-all",
                    i === idx
                      ? "w-5 bg-emerald"
                      : i < idx
                        ? "bg-emerald/40"
                        : "bg-border",
                  ].join(" ")}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => setIdx((n) => Math.max(0, n - 1))}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground/30"
                >
                  <IconArrowLeft size={14} stroke={2} aria-hidden />
                  Back
                </button>
              )}
              {!isLast ? (
                <button
                  type="button"
                  onClick={() =>
                    setIdx((n) => Math.min(SLIDES.length - 1, n + 1))
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-5 py-2 text-sm font-semibold text-background transition-colors hover:bg-emerald-hover"
                >
                  Next
                  <IconArrowRight size={14} stroke={2} aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void finish()}
                  disabled={finishing}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-6 py-2 text-sm font-semibold text-background transition-colors hover:bg-emerald-hover disabled:opacity-70"
                >
                  Get started
                  <IconArrowRight size={14} stroke={2} aria-hidden />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SlideVisual({ kind }: { kind: Slide["visual"] }) {
  if (kind === "aven") {
    return (
      <div className="flex shrink-0 items-center justify-center rounded-2xl border border-emerald/25 bg-emerald/[0.06] p-5">
        <AvenAvatar size={56} online breath />
      </div>
    );
  }
  if (kind === "brief") {
    return (
      <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/[0.06] text-amber-300">
        <IconSparkles size={32} stroke={1.5} aria-hidden />
      </div>
    );
  }
  return (
    <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-emerald/30 bg-emerald/[0.06] text-emerald">
      <IconSparkles size={32} stroke={1.5} aria-hidden />
    </div>
  );
}

export const WELCOME_LOCAL_STORAGE_KEY = LOCAL_STORAGE_KEY;
