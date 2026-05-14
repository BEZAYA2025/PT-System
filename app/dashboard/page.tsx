import type { Metadata } from "next";
import { TopStripMetrics } from "@/components/dashboard/TopStripMetrics";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { AvenChat } from "@/components/dashboard/AvenChat";
import { TradesGrid } from "@/components/dashboard/TradesGrid";
import {
  mockMetrics,
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

// ITERATION 1 — Skeleton with mock fixtures. Each section is replaced by a
// real backend call in subsequent iterations:
//   - Iteration 2: TopStrip ← /api/coinglass/*
//   - Iteration 3: DailyBriefCard ← /api/cockpit/snapshot.latest_briefing
//   - Iteration 4: TradesGrid ← /api/cockpit/snapshot.{open_trades,public_trades}
//   - Iteration 5: AvenChat ← /api/proxy/aven/{history,chat,quota,voice}

export default function DashboardPage() {
  return (
    <main id="main" className="space-y-8 sm:space-y-10">
      <TopStripMetrics metrics={mockMetrics} />

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
