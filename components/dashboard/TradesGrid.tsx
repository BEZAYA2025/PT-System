"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconClockHour4,
  IconRefresh,
} from "@tabler/icons-react";
import { TradeDetailModal } from "./TradeDetailModal";
import {
  MyTradesSection,
  PaulsTradesSection,
} from "./TradesSection";
import {
  buildTradesView,
  type AnyTrade,
  type TradesView,
} from "@/lib/trades";
import { usePolling } from "@/lib/use-polling";

// Round-14d: 30s → 5s so the Unrealized PnL top-card breathes in
// near-real-time alongside the price ticker. Page Visibility pause via
// usePolling avoids hammering the VPS while the tab is backgrounded.
const POLL_INTERVAL_MS = 5_000;
const STALE_THRESHOLD_MS = 2 * 60_000;
const STALE_TICK_MS = 15_000;

interface Props {
  initial: TradesView | null;
}

export function TradesGrid({ initial }: Props) {
  const [view, setView] = useState<TradesView | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initial === null);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const [detail, setDetail] = useState<AnyTrade | null>(null);
  const inFlight = useRef(false);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const [myRes, paulRes] = await Promise.all([
        fetch("/api/proxy/cockpit/my-trades", { cache: "no-store" }),
        fetch("/api/proxy/cockpit/paul-trades", { cache: "no-store" }),
      ]);
      if (!myRes.ok && !paulRes.ok) {
        setError(`My ${myRes.status} · Paul ${paulRes.status}`);
        return;
      }
      const myRaw = myRes.ok ? await myRes.json().catch(() => null) : null;
      const paulRaw = paulRes.ok ? await paulRes.json().catch(() => null) : null;
      setView(buildTradesView(myRaw, paulRaw, Date.now()));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initial) return;
    void fetchOnce();
  }, [initial, fetchOnce]);

  usePolling({ fn: fetchOnce, intervalMs: POLL_INTERVAL_MS });

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), STALE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Round-16: re-tick uses `mountedNow` (null before mount → null
  // after server pass) so isStale is always null/false during SSR.
  // Client populates the real timestamp on mount + every STALE_TICK_MS.
  const [mountedNow, setMountedNow] = useState<number | null>(null);
  useEffect(() => {
    setMountedNow(Date.now());
    const id = setInterval(() => setMountedNow(Date.now()), STALE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) return <SkeletonTrades />;

  // Round-16 hydration #418 fix: Date.now() during SSR ≠ Date.now()
  // on client mount, so reading it in the render body produces a
  // text-node mismatch (the "Xm ago" label) AND a tree mismatch (the
  // stale badge appearing/disappearing). useTick triggers a re-render
  // on the client only — the SSR pass renders with `null` for the
  // banner, the client populates after mount. Wrapping the visible
  // "Xm ago" text in suppressHydrationWarning would still throw on
  // tree-shape differences, so deferring is the right call here.
  const ageMs = view && mountedNow !== null ? mountedNow - view.fetchedAt : null;
  const isStale = ageMs !== null && ageMs > STALE_THRESHOLD_MS;

  return (
    <>
      <div className="space-y-3">
        {error && view === null && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-2.5 text-sm"
          >
            <p className="flex items-center gap-2 text-amber-200">
              <IconAlertCircle size={16} stroke={1.75} aria-hidden />
              Trades momentarily unreachable
            </p>
            <button
              type="button"
              onClick={() => void fetchOnce()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-foreground/30 disabled:opacity-60"
            >
              <IconRefresh
                size={12}
                stroke={2}
                className={refreshing ? "animate-spin" : ""}
              />
              {refreshing ? "Retrying…" : "Retry"}
            </button>
          </div>
        )}

        {isStale && !error && ageMs !== null && (
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <IconClockHour4 size={12} stroke={1.75} aria-hidden />
            Stale data · last refresh {Math.floor(ageMs / 60_000)}m ago
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <MyTradesSection
            active={view?.your.active ?? []}
            recent={view?.your.recent ?? []}
            stats={
              view?.your.stats ?? {
                unrealizedPnlSum: null,
                unrealizedPnlPct: null,
                realizedPnlSum: null,
                winRatePct: null,
                closedCount: null,
              }
            }
            meta={view?.yourMeta}
            onSelect={setDetail}
          />
          <PaulsTradesSection
            active={view?.pauls.active ?? []}
            recent={view?.pauls.recent ?? []}
            stats={
              view?.pauls.stats ?? {
                unrealizedPnlSum: null,
                unrealizedPnlPct: null,
                realizedPnlSum: null,
                winRatePct: null,
                closedCount: null,
              }
            }
            onSelect={setDetail}
          />
        </div>
      </div>

      <TradeDetailModal trade={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function SkeletonTrades() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
      {[0, 1].map((col) => (
        <section
          key={col}
          className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6"
        >
          <span className="block h-4 w-24 animate-pulse rounded bg-surface-elevated" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((c) => (
              <div
                key={c}
                className="rounded-xl border border-border bg-background px-4 py-3"
              >
                <span className="block h-3 w-16 animate-pulse rounded bg-surface" />
                <span className="mt-2 block h-6 w-24 animate-pulse rounded bg-surface" />
                <span className="mt-2 block h-3 w-20 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-background px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  <span className="h-4 w-20 animate-pulse rounded bg-surface" />
                  <span className="h-4 w-10 animate-pulse rounded bg-surface" />
                </div>
                <span className="mt-2 block h-3 w-3/4 animate-pulse rounded bg-surface" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
