import type { Metadata } from "next";
import {
  getInitialAvenHistory,
  getInitialMyTrades,
  getInitialPaulTrades,
  getRawSnapshot,
  requireUser,
} from "@/lib/dal";
import {
  buildBtcPriceView,
  buildMarketPulseView,
  type MarketPulseView,
  type RawSnapshotMetrics,
} from "@/lib/metrics";
import { shapeBrief, type RawBriefShape } from "@/lib/daily-brief";
import { buildTradesView } from "@/lib/trades";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { DailyBriefCard } from "@/components/dashboard/DailyBriefCard";
import { AvenChat } from "@/components/dashboard/AvenChat";
import { TradesGrid } from "@/components/dashboard/TradesGrid";
import { MemberStatsCards } from "@/components/dashboard/MemberStatsCards";
import { OnboardingExperience } from "@/components/dashboard/OnboardingExperience";
import { SetupProgressCard } from "@/components/dashboard/SetupProgressCard";
import { MotionSection } from "@/components/dashboard/MotionSection";
import { CredentialDesyncCheck } from "@/components/dashboard/CredentialDesyncCheck";
import {
  computeSetupSteps,
  readSetupDismissed,
  setupAllComplete,
} from "@/lib/setup-steps";

export const metadata: Metadata = {
  title: "Dashboard · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ROUND 8 — Layout iteration (Variant A):
//   1. Header (Brand + Live + BTC pill + bell + settings)
//   2. MemberStatsCards   (NEW — top-level: BTC live · Unrealized · Realized)
//   3. AvenChat            (visually prominent — emerald glow + breathing avatar)
//   4. DailyBriefCard
//   5. MarketPulse         (5-card market metrics)
//   6. TradesGrid          (Your + Paul's, Open + Last 5 only — top-cards moved up)

export default async function DashboardPage() {
  const user = await requireUser();
  const [raw, myRaw, paulRaw, history] = await Promise.all([
    getRawSnapshot(),
    getInitialMyTrades(),
    getInitialPaulTrades(),
    getInitialAvenHistory(50),
  ]);
  const fetchedAt = Date.now();
  const initialMetrics: MarketPulseView | null = raw
    ? buildMarketPulseView(raw as RawSnapshotMetrics, fetchedAt)
    : null;
  const initialBrief = raw ? shapeBrief(raw as RawBriefShape) : null;
  const initialTrades = buildTradesView(myRaw, paulRaw, fetchedAt);
  const initialBtcPrice = raw
    ? buildBtcPriceView(raw as RawSnapshotMetrics, fetchedAt).price
    : null;

  const showTour = user.first_login_completed === false;
  // onboarding_completed === false explicitly means the backend has the
  // field and the member hasn't dismissed yet. `undefined` (older backend
  // builds) also surfaces the modal — the client-side localStorage hint
  // then keeps reloads from re-triggering it.
  const showWelcome = user.onboarding_completed !== true;

  const setupSteps = computeSetupSteps(user);
  const setupDismissed =
    user.setup_progress_dismissed === true || (await readSetupDismissed());
  const showSetup = !setupAllComplete(setupSteps);

  return (
    <main id="main" className="space-y-8 sm:space-y-6">
      {showSetup && (
        <MotionSection delay={0.01}>
          <SetupProgressCard
            steps={setupSteps}
            initiallyDismissed={setupDismissed}
          />
        </MotionSection>
      )}

      <MotionSection delay={0.02}>
        <MemberStatsCards
          btcPrice={initialBtcPrice}
          stats={initialTrades.your.stats}
          meta={initialTrades.yourMeta}
          credentialStatus={user.credential_status}
        />
      </MotionSection>

      <MotionSection tour="aven" delay={0.08}>
        <AvenChat
          initialMessages={history.messages}
          initialHasOlder={history.hasMore}
          displayName={user.display_name}
        />
      </MotionSection>

      <MotionSection tour="brief" delay={0.14}>
        <DailyBriefCard brief={initialBrief} />
      </MotionSection>

      <MotionSection tour="market" delay={0.20}>
        <MarketPulse initial={initialMetrics} />
      </MotionSection>

      <MotionSection tour="trades" delay={0.26}>
        <TradesGrid initial={initialTrades} />
      </MotionSection>

      <OnboardingExperience
        displayName={user.display_name ?? null}
        showWelcome={showWelcome}
        showTour={showTour}
      />

      {/* Round-13b: production hit a false-positive where /api/auth/me
          reported `binance_api_key_connected: true` for a user with no
          row in the keys table while /api/cockpit/my-trades correctly
          said `has_exchange: false`. This null-rendering component logs
          a console.warn whenever the two disagree so any future drift
          is caught in dev-tools instead of via user reports. */}
      <CredentialDesyncCheck
        meSnapshot={{
          binance_api_key_connected: user.binance_api_key_connected,
          credential_status: user.credential_status,
          has_exchange_connection: user.has_exchange_connection,
          exchange_type: user.exchange_type ?? null,
        }}
        myTradesSnapshot={{
          hasExchange: initialTrades.yourMeta?.hasExchange ?? false,
          exchangeType: initialTrades.yourMeta?.exchangeType ?? null,
        }}
      />
    </main>
  );
}
