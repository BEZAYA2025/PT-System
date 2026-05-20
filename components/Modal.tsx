"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "@tabler/icons-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  // ReactNode (not just string) so consumers can compose richer headings
  // — e.g. the DailyBrief modal puts the asset pill + relative time
  // inline with the title. Plain strings continue to work unchanged.
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  // xl is the chat-replay workhorse — wide enough for many bubbles
  // side-by-side on desktop while still staying within phone width
  // (max-w- is a ceiling, not a fixed width).
  xl: "max-w-4xl",
};

// Round-20: on phones the modal content can overflow the viewport
// height. Without internal scroll, the close button gets trapped
// below the fold and the only way out was a hard page reload. The
// fix caps the modal at 90vh, makes the body internally-scrollable,
// pins the close button into a sticky header, and adds a swipe-down
// gesture so mobile members can dismiss with the same flick they'd
// use on a native bottom-sheet.

const SWIPE_CLOSE_THRESHOLD_PX = 90;

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // Swipe-down-to-close — only engages when the body is scrolled to
  // the top, so a member who's mid-scroll inside the modal can still
  // drag the content upward without accidentally closing.
  const onTouchStart = (e: React.TouchEvent) => {
    const el = bodyRef.current;
    if (el && el.scrollTop > 0) return;
    dragStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - dragStartY.current;
    if (dy > 0) setDragOffset(dy);
  };

  const onTouchEnd = () => {
    if (dragOffset > SWIPE_CLOSE_THRESHOLD_PX) {
      onClose();
    }
    dragStartY.current = null;
    setDragOffset(0);
  };

  // Outer click-to-close — runs on pointerDown so it also covers
  // touch-tap on the backdrop (touchend would also fire `click`
  // but pointer events deliver more consistent behaviour across
  // iOS Safari + Android Chrome).
  const onBackdropPointerDown = (e: React.PointerEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    // The outer container IS the backdrop — no separate sibling div.
    // Previous structure had `<div absolute inset-0 bg-…>` as a child,
    // so a click on the visible "outside" area landed on the backdrop
    // child, not on this container. `e.target === e.currentTarget`
    // therefore never matched and backdrop-click-to-close silently
    // failed in production.
    //
    // Mobile: `items-start` anchors the modal to the top of the visible
    // viewport so the sticky header (with the X button) is always in
    // reach when the modal opens. On iOS Safari `vh` units count
    // against the LARGE viewport that hides under the URL bar, so we
    // size with `svh` to stay inside the area that's actually visible.
    // Safe-area-inset padding handles notch / Dynamic Island devices.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/80 backdrop-blur-sm sm:items-center"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom), 1rem)",
        paddingLeft: "max(env(safe-area-inset-left), 1rem)",
        paddingRight: "max(env(safe-area-inset-right), 1rem)",
      }}
      onPointerDown={onBackdropPointerDown}
    >
      <div
        className={`relative flex max-h-[90svh] w-full ${SIZE[size]} flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl`}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? "none" : "transform 200ms ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Fixed header — sits outside the scroll surface so it stays
            visible no matter how far the member scrolls in a long
            briefing. `shrink-0` stops flexbox from trying to compress
            the header when body content is taller than the modal:
            without it, when total content exceeds `max-h-[90svh]` the
            algorithm could shrink the header to make room. Paired
            with `min-h-0` on the body below, which is what actually
            activates body-only scrolling. */}
        <header className="z-10 flex shrink-0 items-start justify-between gap-3 border-b border-border bg-surface-elevated px-5 py-4 sm:px-7 sm:py-5">
          {/* Drag handle indicator — only renders on touch devices via
              CSS media query (no JS sniff). Cosmetic; the actual
              gesture detection lives on the body. */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1.5 hidden h-1 w-10 -translate-x-1/2 rounded-full bg-border [@media(pointer:coarse)]:block"
          />
          <div className="min-w-0 flex-1">
            <h2
              id="modal-title"
              className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        </header>

        {/* Scrollable body — `flex-1` plus `min-h-0` is the key pair
            that makes body-only scrolling work. Flex items default to
            `min-height: auto`, which clamps them to their content's
            min height and prevents shrinking. With long briefings
            that meant the body extended past the modal box, got
            clipped by the outer `overflow-hidden`, and the body's
            own `overflow-y-auto` never had any overflow to scroll —
            so any scroll that did happen moved the header out with
            it. `min-h-0` lets the body shrink to `max-h - header`,
            its overflow-y-auto activates, and the header (a sibling
            outside this scroll surface) stays fixed at the top. */}
        <div
          ref={bodyRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
