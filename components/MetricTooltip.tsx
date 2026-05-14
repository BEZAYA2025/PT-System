"use client";

import { useEffect, useRef, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";

interface Props {
  label: string;
  explanation: string;
}

export function MetricTooltip({ label, explanation }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`About ${label}`}
        aria-expanded={open}
        className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <IconInfoCircle size={12} stroke={1.75} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-full z-30 mt-2 w-60 rounded-lg border border-border bg-surface-elevated p-3 text-left shadow-2xl"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-emerald">
            {label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
