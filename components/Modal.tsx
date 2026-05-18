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
  size?: "sm" | "md" | "lg";
}

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onPointerDown={onBackdropPointerDown}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div
        className={`relative flex max-h-[90vh] w-full ${SIZE[size]} flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-2xl`}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? "none" : "transform 200ms ease-out",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Sticky header — close button + title stay reachable even
            when the body is scrolled. The 4-row top is taller than
            the title font so the close button has a comfortable
            44×44 touch target on mobile. */}
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface-elevated px-5 py-4 sm:px-7 sm:py-5">
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

        {/* Scrollable body — flex-1 lets it fill the remaining height
            inside the max-h-[90vh] container, overflow-y-auto kicks
            in when content exceeds that. */}
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6"
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
