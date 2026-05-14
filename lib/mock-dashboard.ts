// Mock fixtures for the dashboard skeleton.
// Each iteration replaces the relevant fixture with a real backend call.

export type Trend = "bullish" | "bearish" | "neutral";

export interface MetricCard {
  key: string;
  label: string;
  value: string;
  delta?: string;
  trend: Trend;
  caption?: string;
}

export const mockMetrics: MetricCard[] = [
  {
    key: "btc",
    label: "BTC",
    value: "$71,420",
    delta: "+2.34%",
    trend: "bullish",
    caption: "24h",
  },
  {
    key: "fng",
    label: "Fear & Greed",
    value: "62",
    trend: "bullish",
    caption: "Greed",
  },
  {
    key: "oi",
    label: "Open Interest",
    value: "$48.2B",
    delta: "+1.8%",
    trend: "bullish",
    caption: "Aggregated 24h",
  },
  {
    key: "funding",
    label: "Funding",
    value: "0.0142%",
    trend: "bullish",
    caption: "8h avg",
  },
  {
    key: "lsr",
    label: "L/S Ratio",
    value: "1.18",
    trend: "neutral",
    caption: "Slight long bias",
  },
];

export interface DailyBrief {
  generatedAt: string;
  summary: string;
  body: string;
}

export const mockBrief: DailyBrief = {
  generatedAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  summary:
    "BTC reclaiming the 71k pivot after sweeping liquidity below 69.8k overnight. Funding still neutral, no aggressive long crowding. Watching the 72.4k S/R flip — clean break opens 74k as next confluence.",
  body:
    "BTC reclaiming the 71k pivot after sweeping liquidity below 69.8k overnight. Funding still neutral, no aggressive long crowding. Watching the 72.4k S/R flip — clean break opens 74k as next confluence.\n\nETH still lagging — relative weakness keeps it a fade on rips into 3,820. F&G at 62 (greed) but not euphoric; OI accumulating without leverage spikes is a healthy sign.\n\nKey events: PCE Friday, FOMC minutes Wed. Position size cautiously into both.\n\nYour active longs from yesterday are running. SOL +18R, AVAX +6R. No reason to flip risk yet — let the trend pay you.",
};

export type ChatRole = "aven" | "user" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: string;
}

export const mockMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "aven",
    content:
      "Morning baba. BTC swept liquidity overnight and reclaimed the 71k pivot — same setup we discussed Tuesday. Want me to walk through the confluence on the 4h?",
    ts: new Date(Date.now() - 1000 * 60 * 38).toISOString(),
  },
  {
    id: "m2",
    role: "user",
    content: "Yes — and check if SOL still has room to 220.",
    ts: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "m3",
    role: "aven",
    content:
      "SOL: HTF range high sits at 218.40, daily POC at 213.80. You're long from 198 — let it run, but consider trimming 25% at 215 and trail the rest with the 4h structure. Stop to BE under 207.",
    ts: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
  },
];

import type { YourTrade, PaulsTrade, TradesView } from "./trades";

// Re-export for legacy import sites; canonical source lives in lib/trades.ts.
export type { YourTrade, PaulsTrade } from "./trades";

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
const days = (d: number) => new Date(now - d * 24 * 60 * 60_000).toISOString();

export const mockYourTrades: { active: YourTrade[]; recent: YourTrade[] } = {
  active: [
    {
      id: "y1",
      owner: "self",
      symbol: "SOLUSDT",
      side: "long",
      status: "open",
      entry: 198.4,
      mark: 211.7,
      exit: null,
      pnlUsd: 1248.5,
      pnlPct: 6.7,
      slPrice: 195.0,
      tpPrice: 218.4,
      slDistancePct: 7.9,
      tpDistancePct: 3.16,
      openedAt: ago(11 * 60),
      closedAt: null,
      durationLabel: "11h 0m",
    },
    {
      id: "y2",
      owner: "self",
      symbol: "ETHUSDT",
      side: "long",
      status: "open",
      entry: 3742,
      mark: 3781,
      exit: null,
      pnlUsd: 312.0,
      pnlPct: 1.04,
      slPrice: 3690,
      tpPrice: 3920,
      slDistancePct: 2.41,
      tpDistancePct: 3.68,
      openedAt: ago(4 * 60),
      closedAt: null,
      durationLabel: "4h 0m",
    },
  ],
  recent: [
    {
      id: "y3",
      owner: "self",
      symbol: "AVAXUSDT",
      side: "long",
      status: "closed",
      entry: 38.4,
      mark: null,
      exit: 41.2,
      pnlUsd: 567.2,
      pnlPct: 7.3,
      slPrice: 37.6,
      tpPrice: 41.2,
      slDistancePct: null,
      tpDistancePct: null,
      openedAt: days(2),
      closedAt: days(1),
      durationLabel: "1d 6h",
    },
    {
      id: "y4",
      owner: "self",
      symbol: "BTCUSDT",
      side: "long",
      status: "closed",
      entry: 69_840,
      mark: null,
      exit: 71_280,
      pnlUsd: 1148.0,
      pnlPct: 2.06,
      slPrice: 69_200,
      tpPrice: 71_280,
      slDistancePct: null,
      tpDistancePct: null,
      openedAt: days(1),
      closedAt: ago(60 * 14),
      durationLabel: "8h 0m",
    },
    {
      id: "y5",
      owner: "self",
      symbol: "TIAUSDT",
      side: "short",
      status: "closed",
      entry: 7.42,
      mark: null,
      exit: 7.55,
      pnlUsd: -142.1,
      pnlPct: -1.75,
      slPrice: 7.62,
      tpPrice: 7.18,
      slDistancePct: null,
      tpDistancePct: null,
      openedAt: ago(60 * 6),
      closedAt: ago(60 * 3),
      durationLabel: "3h 0m",
    },
  ],
};

export const mockPaulsTrades: { active: PaulsTrade[]; recent: PaulsTrade[] } = {
  active: [
    {
      id: "p1",
      owner: "paul",
      symbol: "BTCUSDT",
      side: "long",
      status: "open",
      entry: 70_120,
      mark: 71_420,
      exit: null,
      pnlPct: 1.85,
      pnlR: 1.5,
      slPrice: 69_400,
      tpPrice: 74_000,
      slDistancePct: 2.83,
      tpDistancePct: 3.61,
      openedAt: ago(9 * 60),
      closedAt: null,
      durationLabel: "9h 0m",
      reasoning:
        "4H reclaim of the 70k pivot after the overnight sweep. Funding still neutral, no aggressive crowding. Risk to 69.4k, structural invalidation under 68.8k.",
    },
    {
      id: "p2",
      owner: "paul",
      symbol: "SOLUSDT",
      side: "long",
      status: "open",
      entry: 196.8,
      mark: 211.7,
      exit: null,
      pnlPct: 7.57,
      pnlR: 3.2,
      slPrice: 193.0,
      tpPrice: 218.4,
      slDistancePct: 8.83,
      tpDistancePct: 3.16,
      openedAt: ago(12 * 60),
      closedAt: null,
      durationLabel: "12h 0m",
      reasoning: null,
    },
  ],
  recent: [
    {
      id: "p3",
      owner: "paul",
      symbol: "AVAXUSDT",
      side: "long",
      status: "closed",
      entry: 38.1,
      mark: null,
      exit: 41.2,
      pnlPct: 8.13,
      pnlR: 3.4,
      slPrice: 37.4,
      tpPrice: 41.2,
      slDistancePct: null,
      tpDistancePct: null,
      openedAt: days(2),
      closedAt: days(1),
      durationLabel: "1d 4h",
      reasoning: null,
    },
    {
      id: "p4",
      owner: "paul",
      symbol: "ETHUSDT",
      side: "short",
      status: "closed",
      entry: 3_820,
      mark: null,
      exit: 3_742,
      pnlPct: 2.04,
      pnlR: 1.1,
      slPrice: 3_870,
      tpPrice: 3_740,
      slDistancePct: null,
      tpDistancePct: null,
      openedAt: ago(60 * 10),
      closedAt: ago(60 * 4),
      durationLabel: "6h 0m",
      reasoning:
        "Daily relative-weakness fade vs BTC. Closed at structural HTF support.",
    },
    {
      id: "p5",
      owner: "paul",
      symbol: "ARBUSDT",
      side: "long",
      status: "closed",
      entry: 0.92,
      mark: null,
      exit: 0.99,
      pnlPct: 7.61,
      pnlR: 2.6,
      slPrice: 0.895,
      tpPrice: 0.99,
      slDistancePct: null,
      tpDistancePct: null,
      openedAt: days(3),
      closedAt: days(2),
      durationLabel: "1d 9h",
      reasoning: null,
    },
  ],
};

export const mockTradesView: TradesView = {
  your: mockYourTrades,
  pauls: mockPaulsTrades,
  fetchedAt: now,
};

export type NotificationKind = "setup" | "trade" | "system";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  ts: string;
  read: boolean;
  /** Optional context shown in the detail modal (e.g. confluence list). */
  context?: string[];
}

export const mockNotifications: NotificationItem[] = [
  {
    id: "n1",
    kind: "setup",
    title: "Setup detected: BTC Zone #1 at $78,879",
    detail: "4H Fib 0.5 + Daily Fib 0.5 + 1H Ray",
    ts: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    read: false,
    context: [
      "4H Fibonacci 0.5 retracement aligns with daily 0.5",
      "1H descending ray meets the zone",
      "Funding still neutral — no crowd here yet",
    ],
  },
  {
    id: "n2",
    kind: "trade",
    title: "SL Distance Warning #2: ETH position approaching invalidation",
    detail: "0.8% from SL",
    ts: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    read: false,
    context: [
      "Mark price 3,712 vs SL 3,683",
      "Position size 0.8x — well within risk limits",
      "Consider trim or trail if structure breaks 3,690",
    ],
  },
  {
    id: "n3",
    kind: "setup",
    title: "Confluence forming: SOL liquidity sweep below 198",
    detail: "Bid wall at 197.40 holding · F&G greed weakening",
    ts: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    read: false,
  },
  {
    id: "n4",
    kind: "trade",
    title: "TP hit: AVAX +7.3% closed",
    detail: "Position closed at 41.20 — +2.9R",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
  },
  {
    id: "n5",
    kind: "system",
    title: "Welcome to PT System, baba!",
    detail: "Connect your exchange to start trading",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read: true,
  },
  {
    id: "n6",
    kind: "trade",
    title: "Position closed: BTC long +2.06%",
    detail: "Filled at 71,280 — duration 8h",
    ts: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    read: true,
  },
];

export interface MockUserView {
  email: string;
  displayName: string;
  tier: "standard" | "vip";
  unreadNotifications: number;
  avenQuotaUsed: number;
  avenQuotaLimit: number | null;
}

export const mockUserView: MockUserView = {
  email: "paul.theobald21311@gmail.com",
  displayName: "Paul",
  tier: "vip",
  unreadNotifications: 2,
  avenQuotaUsed: 8,
  avenQuotaLimit: null,
};
