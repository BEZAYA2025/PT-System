"use client";

import { useEffect, useRef, useState } from "react";
import { IconDots } from "@tabler/icons-react";

export interface ActionMenuItem {
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

interface Props {
  items: ActionMenuItem[];
  label?: string;
}

export function ActionsMenu({ items, label = "Open actions menu" }: Props) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
      >
        <IconDots size={16} stroke={1.75} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-border bg-surface-elevated p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]"
        >
          {items.map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={[
                "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-50",
                item.tone === "danger"
                  ? "text-red-300 hover:bg-red-500/[0.08]"
                  : "text-foreground hover:bg-surface",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
