// Six-step coached tour for new members. Targets are matched via data-tour
// selectors so component refactors don't silently break the flow.

export interface TourStep {
  id:
    | "welcome"
    | "aven"
    | "market"
    | "brief"
    | "trades"
    | "done";
  /** CSS selector for the highlighted element. null = centred, no spotlight. */
  selector: string | null;
  title: string;
  /** Body text. `{name}` is substituted with the display name (or "baba"). */
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    selector: '[data-tour="brand"]',
    title: "Welcome to PT System, {name}!",
    body: "Let me show you around in 60 seconds. You can skip anytime.",
  },
  {
    id: "aven",
    selector: '[data-tour="aven"]',
    title: "Meet Aven",
    body:
      "Your AI trading mentor — ask anything by text or voice. Aven sees the same market data you do, plus Paul's methodology.",
  },
  {
    id: "market",
    selector: '[data-tour="market"]',
    title: "Live market data",
    body:
      "Fear & Greed, Funding, Open Interest, Long/Short ratio. Tap the (?) on any metric for a quick read.",
  },
  {
    id: "brief",
    selector: '[data-tour="brief"]',
    title: "Today's Brief",
    body:
      "Paul + Aven's daily take — multi-timeframe analysis, key levels, watch zones. Refreshed every morning.",
  },
  {
    id: "trades",
    selector: '[data-tour="trades"]',
    title: "Your trades + Paul's trades",
    body:
      "Learn from Paul via R-multiple. Connect your exchange in Settings to start tracking your own positions.",
  },
  {
    id: "done",
    selector: null,
    title: "You're set",
    body:
      "Aven's ready to chat. Settings → Connect Exchange whenever you want to trade. Welcome aboard 🟢",
  },
];

export const TOUR_TARGETS = {
  brand: "brand",
  aven: "aven",
  market: "market",
  brief: "brief",
  trades: "trades",
} as const;
