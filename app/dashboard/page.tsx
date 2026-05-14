import type { Metadata } from "next";
import { getRawSnapshot } from "@/lib/dal";
import {
  buildMetricsView,
  type MetricsView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { shapeBrief, type RawBriefShape } from "@/lib/daily-brief";
import { TopStripMetrics } from "@/components/dashboard/TopStripMetrics";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { AvenChat } from "@/components/dashboard/AvenChat";
import { TradesGrid } from "@/components/dashboard/TradesGrid";
import {
  mockMessages,
  mockYourTrades,
  mockPaulsTrades,
  mockUserView,
} from "@/lib/mock-dashboard";

export const metadata: Metadata = {
  title: "Dashboard · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ITERATION 3 — Daily Brief now reads from /api/cockpit/snapshot via the
// defensive shapeBrief() adapter. NotificationBell evolved into the full
// NotificationCenter (Portal dropdown + bottom-sheet on mobile, mark-read,
// detail modal). Notifications still mock; backend wires in iteration 6.

export default async function DashboardPage() {
  const raw = await getRawSnapshot();
  const initialMetrics: MetricsView | null = raw
    ? buildMetricsView(raw as RawSnapshotMetrics, Date.now())
    : null;
  const initialBrief = raw ? shapeBrief(raw as RawBriefShape) : null;

  return (
    <main id="main" className="space-y-8 sm:space-y-10">
      <TopStripMetrics initial={initialMetrics} />

      <DailyBriefCard brief={initialBrief} />

      <AvenChat
        initialMessages={mockMessages}
        quotaUsed={mockUserView.avenQuotaUsed}
        quotaLimit={mockUserView.avenQuotaLimit}
      />

      <TradesGrid
        yourTrades={mockYourTrades}
        paulsTrades={mockPaulsTrades}
      />
    </main>
  );
}
