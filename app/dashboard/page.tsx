import type { Metadata } from "next";
import {
  getInitialAvenHistory,
  getRawSnapshot,
  requireUser,
} from "@/lib/dal";
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

export const metadata: Metadata = {
  title: "Dashboard · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ITERATION 5 — Aven chat now wires to the live backend:
//   - Initial history via getInitialAvenHistory (SSR seed)
//   - Send via /api/proxy/aven/chat (optimistic UI, retry on fail)
//   - Voice via /api/proxy/aven/voice (MediaRecorder → Whisper)
//   - Quota via /api/proxy/aven/quota
//   - Real-time via EventSource on /api/proxy/events (SSE Edge passthrough),
//     with auto-fallback to /api/proxy/aven/history?since_id polling after
//     three consecutive SSE errors.
// Source-indicators (📱 Telegram / 💻 Web) on every bubble close the
// Telegram-Sync visual contract.

export default async function DashboardPage() {
  const user = await requireUser();
  const [raw, initialMessages] = await Promise.all([
    getRawSnapshot(),
    getInitialAvenHistory(50),
  ]);
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
        initialMessages={initialMessages}
        displayName={user.display_name ?? null}
        firstLoginCompleted={user.first_login_completed}
        lastVisitAt={user.last_dashboard_visit_at ?? null}
      />

      <TradesGrid initial={initialTrades} />
    </main>
  );
}
