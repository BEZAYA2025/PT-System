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

export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed";

export interface MockTrade {
  id: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  entry: number;
  mark?: number;
  exit?: number;
  pnlPct: number;
  pnlR: number;
  durationLabel: string;
  size?: string;
  liquidationDistancePct?: number;
}

export const mockYourTrades: { active: MockTrade[]; recent: MockTrade[] } = {
  active: [
    {
      id: "y1",
      symbol: "SOLUSDT",
      side: "long",
      status: "open",
      entry: 198.4,
      mark: 211.7,
      pnlPct: 6.7,
      pnlR: 2.4,
      durationLabel: "11h open",
      size: "1.2x",
      liquidationDistancePct: 28,
    },
    {
      id: "y2",
      symbol: "ETHUSDT",
      side: "long",
      status: "open",
      entry: 3742,
      mark: 3781,
      pnlPct: 1.04,
      pnlR: 0.6,
      durationLabel: "4h open",
      size: "0.8x",
      liquidationDistancePct: 41,
    },
  ],
  recent: [
    {
      id: "y3",
      symbol: "AVAXUSDT",
      side: "long",
      status: "closed",
      entry: 38.4,
      exit: 41.2,
      pnlPct: 7.3,
      pnlR: 2.9,
      durationLabel: "1d 6h",
    },
    {
      id: "y4",
      symbol: "BTCUSDT",
      side: "long",
      status: "closed",
      entry: 69_840,
      exit: 71_280,
      pnlPct: 2.06,
      pnlR: 1.2,
      durationLabel: "8h",
    },
    {
      id: "y5",
      symbol: "TIAUSDT",
      side: "short",
      status: "closed",
      entry: 7.42,
      exit: 7.55,
      pnlPct: -1.75,
      pnlR: -0.8,
      durationLabel: "3h",
    },
  ],
};

export const mockPaulsTrades: { active: MockTrade[]; recent: MockTrade[] } = {
  active: [
    {
      id: "p1",
      symbol: "BTCUSDT",
      side: "long",
      status: "open",
      entry: 70_120,
      mark: 71_420,
      pnlPct: 1.85,
      pnlR: 1.5,
      durationLabel: "9h open",
    },
    {
      id: "p2",
      symbol: "SOLUSDT",
      side: "long",
      status: "open",
      entry: 196.8,
      mark: 211.7,
      pnlPct: 7.57,
      pnlR: 3.2,
      durationLabel: "12h open",
    },
  ],
  recent: [
    {
      id: "p3",
      symbol: "AVAXUSDT",
      side: "long",
      status: "closed",
      entry: 38.1,
      exit: 41.2,
      pnlPct: 8.13,
      pnlR: 3.4,
      durationLabel: "1d 4h",
    },
    {
      id: "p4",
      symbol: "ETHUSDT",
      side: "short",
      status: "closed",
      entry: 3_820,
      exit: 3_742,
      pnlPct: 2.04,
      pnlR: 1.1,
      durationLabel: "6h",
    },
    {
      id: "p5",
      symbol: "ARBUSDT",
      side: "long",
      status: "closed",
      entry: 0.92,
      exit: 0.99,
      pnlPct: 7.61,
      pnlR: 2.6,
      durationLabel: "1d 9h",
    },
  ],
};

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
