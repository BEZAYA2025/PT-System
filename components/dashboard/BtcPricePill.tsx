"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildBtcPriceView,
  type BtcPriceView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { usePolling } from "@/lib/use-polling";

// Round-14d: dropped 60s → 5s with Page Visibility pause. Price needs
// to feel live; the hook stops the loop while the tab is backgrounded.
const POLL_INTERVAL_MS = 5_000;

function fmtPrice(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1000)
    return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

interface Props {
  initial: BtcPriceView | null;
}

export function BtcPricePill({ initial }: Props) {
  const [view, setView] = useState<BtcPriceView | null>(initial);
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/proxy/snapshot", { cache: "no-store" });
      if (!res.ok) return;
      const raw = (await res.json()) as RawSnapshotMetrics;
      setView(buildBtcPriceView(raw, Date.now()));
    } catch {
      // Silent — non-critical.
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!initial) void fetchOnce();
  }, [initial, fetchOnce]);

  usePolling({ fn: fetchOnce, intervalMs: POLL_INTERVAL_MS });

  if (!view || view.price === null) return null;

  const tone =
    view.changePct === null
      ? "text-muted-foreground"
      : view.changePct >= 0
        ? "text-emerald"
        : "text-red-300";

  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-0.5 sm:inline-flex">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        BTC
      </span>
      <span className="font-mono text-xs font-semibold text-foreground">
        {fmtPrice(view.price)}
      </span>
      {view.changePct !== null && (
        <span className={`font-mono text-[10px] ${tone}`}>
          {view.changePct > 0 ? "+" : ""}
          {view.changePct.toFixed(2)}%
        </span>
      )}
    </span>
  );
}
