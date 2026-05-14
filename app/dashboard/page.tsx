import type { Metadata } from "next";
import { getRawSnapshot } from "@/lib/dal";
import {
  buildMetricsView,
  type MetricsView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { TopStripMetrics } from "@/components/dashboard/TopStripMetrics";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { AvenChat } from "@/components/dashboard/AvenChat";
import { TradesGrid } from "@/components/dashboard/TradesGrid";
import {
  mockBrief,
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

// ITERATION 2 — TopStripMetrics now polls /api/proxy/snapshot every 60s.
// Server fetches an initial seed via getRawSnapshot so the first paint shows
// real numbers (no skeleton flash) when the backend is reachable. When the
// backend is down or returns an unexpected shape, the client surfaces a
// retry-able error banner without breaking the page.
//
// Remaining sections (DailyBriefCard, AvenChat, TradesGrid) still render
// mock fixtures — they get wired in iterations 3, 4, and 5.

export default async function DashboardPage() {
  const raw = (await getRawSnapshot()) as RawSnapshotMetrics | null;
  const initialMetrics: MetricsView | null = raw
    ? buildMetricsView(raw, Date.now())
    : null;

  return (
    <main id="main" className="space-y-8 sm:space-y-10">
      <TopStripMetrics initial={initialMetrics} />

      <DailyBriefCard brief={mockBrief} />

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
