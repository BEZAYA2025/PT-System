// Backend-shape adapter for the TopStrip live metrics.
// Reads several plausible paths from /api/cockpit/snapshot — keep this in
// sync once the backend payload is finalized.

import type { MetricCard, Trend } from "./mock-dashboard";

export const METRIC_KEYS = ["btc", "fng", "oi", "funding", "lsr"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export interface MetricMeta {
  shortLabel: string;
  fullLabel: string;
  explanation: string;
}

export const METRIC_META: Record<MetricKey, MetricMeta> = {
  btc: {
    shortLabel: "BTC",
    fullLabel: "Bitcoin price",
    explanation:
      "Bitcoin spot price + 24h change. The market's primary anchor — sets the tone for everything else.",
  },
  fng: {
    shortLabel: "Fear & Greed",
    fullLabel: "Crypto Fear & Greed Index",
    explanation:
      "0–100 score from the alternative.me index. <25 = extreme fear, >75 = extreme greed. Contrarian signal at extremes.",
  },
  oi: {
    shortLabel: "Open Interest",
    fullLabel: "Aggregated Open Interest",
    explanation:
      "Total $ value of open futures contracts across exchanges. Rising OI + rising price = real buying. Rising OI + flat price = positioning building.",
  },
  funding: {
    shortLabel: "Funding",
    fullLabel: "Perpetual funding rate",
    explanation:
      "8h average funding paid between longs and shorts. Positive = longs pay shorts (bullish positioning crowded). Negative = shorts pay longs.",
  },
  lsr: {
    shortLabel: "L/S Ratio",
    fullLabel: "Long / Short ratio",
    explanation:
      "Ratio of long positions to short positions across major exchanges. 1.0 = neutral. >1.2 = long-heavy crowd. <0.8 = short-heavy.",
  },
};

// What we hope the backend hands us. All fields optional — the adapter
// degrades gracefully when something is missing and surfaces "—" in the UI.
export interface RawSnapshotMetrics {
  generated_at?: string;
  // Several plausible shapes — read whichever is present.
  btc_price?: number;
  btc_change_24h_pct?: number;
  btc?: { price?: number; change_24h_pct?: number };
  fear_greed_value?: number;
  fear_greed_label?: string;
  fear_greed?: { value?: number; label?: string };
  oi_aggregated_usd?: number;
  oi_delta_24h_pct?: number;
  open_interest?: {
    aggregated_usd?: number;
    delta_24h_pct?: number;
  };
  funding_rate?: number;
  funding?: { rate?: number };
  long_short_ratio?: number;
  lsr?: number;
}

export interface MetricsView {
  cards: MetricCard[];
  generatedAt: string | null;
  /** Wall-clock ms when the client received this payload. */
  fetchedAt: number;
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

function pickBtcPrice(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.btc_price) ?? num(raw?.btc?.price);
}
function pickBtcChange(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.btc_change_24h_pct) ?? num(raw?.btc?.change_24h_pct);
}
function pickFng(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.fear_greed_value) ?? num(raw?.fear_greed?.value);
}
function pickFngLabel(raw: RawSnapshotMetrics | null): string | null {
  return str(raw?.fear_greed_label) ?? str(raw?.fear_greed?.label);
}
function pickOi(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.oi_aggregated_usd) ?? num(raw?.open_interest?.aggregated_usd);
}
function pickOiDelta(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.oi_delta_24h_pct) ?? num(raw?.open_interest?.delta_24h_pct);
}
function pickFunding(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.funding_rate) ?? num(raw?.funding?.rate);
}
function pickLsr(raw: RawSnapshotMetrics | null): number | null {
  return num(raw?.long_short_ratio) ?? num(raw?.lsr);
}

const PLACEHOLDER = "—";

function fmtPrice(n: number | null): string {
  if (n === null) return PLACEHOLDER;
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

function fmtCompactUsd(n: number | null): string {
  if (n === null) return PLACEHOLDER;
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function fmtPct(n: number | null, digits = 2, withSign = true): string {
  if (n === null) return PLACEHOLDER;
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

function fmtFundingPct(n: number | null): string {
  if (n === null) return PLACEHOLDER;
  // Funding usually comes as decimal (0.0001 = 0.01%) or already-pct.
  // Heuristic: if absolute value <0.01 treat as decimal.
  const pct = Math.abs(n) < 0.01 ? n * 100 : n;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(4)}%`;
}

function trendFromChange(n: number | null): Trend {
  if (n === null) return "neutral";
  if (n > 0.05) return "bullish";
  if (n < -0.05) return "bearish";
  return "neutral";
}

function trendFromFng(n: number | null): Trend {
  if (n === null) return "neutral";
  if (n >= 60) return "bullish";
  if (n <= 40) return "bearish";
  return "neutral";
}

function fngLabel(n: number | null, override: string | null): string {
  if (override) return override;
  if (n === null) return "—";
  if (n <= 24) return "Extreme fear";
  if (n <= 44) return "Fear";
  if (n <= 55) return "Neutral";
  if (n <= 74) return "Greed";
  return "Extreme greed";
}

function fundingTrend(n: number | null): Trend {
  if (n === null) return "neutral";
  const pct = Math.abs(n) < 0.01 ? n * 100 : n;
  if (pct > 0.01) return "bullish";
  if (pct < -0.01) return "bearish";
  return "neutral";
}

function lsrTrend(n: number | null): Trend {
  if (n === null) return "neutral";
  if (n >= 1.2) return "bullish";
  if (n <= 0.85) return "bearish";
  return "neutral";
}

function lsrCaption(n: number | null): string {
  if (n === null) return PLACEHOLDER;
  if (n >= 1.2) return "Long-heavy crowd";
  if (n <= 0.85) return "Short-heavy crowd";
  return "Slight long bias";
}

export function shapeMetrics(raw: RawSnapshotMetrics | null): MetricCard[] {
  const btcPrice = pickBtcPrice(raw);
  const btcChange = pickBtcChange(raw);
  const fng = pickFng(raw);
  const fngLabelOverride = pickFngLabel(raw);
  const oi = pickOi(raw);
  const oiDelta = pickOiDelta(raw);
  const funding = pickFunding(raw);
  const lsr = pickLsr(raw);

  return [
    {
      key: "btc",
      label: METRIC_META.btc.shortLabel,
      value: fmtPrice(btcPrice),
      delta: btcChange !== null ? fmtPct(btcChange) : undefined,
      trend: trendFromChange(btcChange),
      caption: "24h",
    },
    {
      key: "fng",
      label: METRIC_META.fng.shortLabel,
      value: fng !== null ? String(fng) : PLACEHOLDER,
      trend: trendFromFng(fng),
      caption: fngLabel(fng, fngLabelOverride),
    },
    {
      key: "oi",
      label: METRIC_META.oi.shortLabel,
      value: fmtCompactUsd(oi),
      delta: oiDelta !== null ? fmtPct(oiDelta) : undefined,
      trend: trendFromChange(oiDelta),
      caption: "Aggregated 24h",
    },
    {
      key: "funding",
      label: METRIC_META.funding.shortLabel,
      value: fmtFundingPct(funding),
      trend: fundingTrend(funding),
      caption: "8h avg",
    },
    {
      key: "lsr",
      label: METRIC_META.lsr.shortLabel,
      value: lsr !== null ? lsr.toFixed(2) : PLACEHOLDER,
      trend: lsrTrend(lsr),
      caption: lsrCaption(lsr),
    },
  ];
}

export function buildMetricsView(
  raw: RawSnapshotMetrics | null,
  fetchedAt: number,
): MetricsView {
  return {
    cards: shapeMetrics(raw),
    generatedAt: str(raw?.generated_at) ?? null,
    fetchedAt,
  };
}
