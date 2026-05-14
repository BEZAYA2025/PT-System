import type { Metadata } from "next";
import {
  getInitialAvenHistory,
  getInitialPaulTrades,
  getRawSnapshot,
  requireUser,
} from "@/lib/dal";
import {
  buildMetricsView,
  type MetricsView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { shapeBrief, type RawBriefShape } from "@/lib/daily-brief";
import { buildTradesView } from "@/lib/trades";
import { TopStripMetrics } from "@/components/dashboard/TopStripMetrics";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { AvenChat } from "@/components/dashboard/AvenChat";
import { TradesGrid } from "@/components/dashboard/TradesGrid";
import { SpotlightTour } from "@/components/dashboard/SpotlightTour";
import { MotionSection } from "@/components/dashboard/MotionSection";

export const metadata: Metadata = {
  title: "Dashboard · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ITERATION 7 — Coached spotlight tour for first-time members and proper
// daily-greeting integration.
//   - SpotlightTour mounts only when user.first_login_completed === false.
//     The 6-step flow targets sections via data-tour selectors (resilient to
//     component refactors) and POSTs first-login-complete on Done/Skip.
//   - The synthetic greeting injection from iter 5 is gone. The greeting is
//     now a real Aven message stamped meta.greeting=true on the backend; the
//     bubble surfaces a subtle "Daily greeting" badge.

export default async function DashboardPage() {
  const user = await requireUser();
  const [raw, paulRaw, history] = await Promise.all([
    getRawSnapshot(),
    getInitialPaulTrades(),
    getInitialAvenHistory(50),
  ]);
  const fetchedAt = Date.now();
  const initialMetrics: MetricsView | null = raw
    ? buildMetricsView(raw as RawSnapshotMetrics, fetchedAt)
    : null;
  const initialBrief = raw ? shapeBrief(raw as RawBriefShape) : null;
  const initialTrades = buildTradesView(raw, paulRaw, fetchedAt);

  const showTour = user.first_login_completed === false;

  return (
    <main id="main" className="space-y-8 sm:space-y-10">
      <MotionSection tour="market" delay={0.04}>
        <TopStripMetrics initial={initialMetrics} />
      </MotionSection>

      <MotionSection tour="brief" delay={0.1}>
        <DailyBriefCard brief={initialBrief} />
      </MotionSection>

      <MotionSection tour="aven" delay={0.16}>
        <AvenChat
          initialMessages={history.messages}
          initialHasOlder={history.hasMore}
        />
      </MotionSection>

      <MotionSection tour="trades" delay={0.22}>
        <TradesGrid initial={initialTrades} />
      </MotionSection>

      {showTour && <SpotlightTour displayName={user.display_name ?? null} />}
    </main>
  );
}
