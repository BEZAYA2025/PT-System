import type { Metadata } from "next";
import { getRawSnapshot } from "@/lib/dal";
import {
  buildMetricsView,
  type MetricsView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { shapeBrief, type RawBriefShape } from "@/lib/daily-brief";
import { shapeTrades } from "@/lib/trades";
import { TopStripMetrics } from "@/components/dashboard/TopStripMetrics";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { AvenChat } from "@/components/dashboard/AvenChat";
import { TradesGrid } from "@/components/dashboard/TradesGrid";
import { mockMessages, mockUserView } from "@/lib/mock-dashboard";

export const metadata: Metadata = {
  title: "Dashboard · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ITERATION 4 — TradesGrid now polls /api/proxy/snapshot at 30s, with a
// defensive shapeTrades() that respects privacy contracts:
//   YourTrade  → USD PnL + ROI %  (no R-multiple)
//   PaulsTrade → ROI % + R-multiple + optional reasoning  (no USD PnL)
// Click any row → TradeDetailModal with full fields and (for Paul) the
// reasoning notes when present.

export default async function DashboardPage() {
  const raw = await getRawSnapshot();
  const fetchedAt = Date.now();
  const initialMetrics: MetricsView | null = raw
    ? buildMetricsView(raw as RawSnapshotMetrics, fetchedAt)
    : null;
  const initialBrief = raw ? shapeBrief(raw as RawBriefShape) : null;
  const initialTrades = raw ? shapeTrades(raw, fetchedAt) : null;

  return (
    <main id="main" className="space-y-8 sm:space-y-10">
      <TopStripMetrics initial={initialMetrics} />

      <DailyBriefCard brief={initialBrief} />

      <AvenChat
        initialMessages={mockMessages}
        quotaUsed={mockUserView.avenQuotaUsed}
        quotaLimit={mockUserView.avenQuotaLimit}
      />

      <TradesGrid initial={initialTrades} />
    </main>
  );
}
