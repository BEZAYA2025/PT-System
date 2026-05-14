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

// Loose-typed snapshot record. The adapter walks several plausible paths
// per metric so a backend rename doesn't blank a card.
export type RawSnapshotMetrics = Record<string, unknown>;

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

/** Walk a dotted-path against the raw snapshot. Returns the value at the
 *  leaf or undefined when any segment is missing. */
function dig(raw: unknown, path: string): unknown {
  if (raw === null || raw === undefined) return undefined;
  let cur: unknown = raw;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
    if (cur === undefined) return undefined;
  }
  return cur;
}

/** Try a list of paths until one yields a finite number. */
function pickNumber(raw: unknown, paths: string[]): number | null {
  for (const p of paths) {
    const v = num(dig(raw, p));
    if (v !== null) return v;
  }
  return null;
}

function pickString(raw: unknown, paths: string[]): string | null {
  for (const p of paths) {
    const v = str(dig(raw, p));
    if (v !== null) return v;
  }
  return null;
}

// Common envelopes the snapshot might be wrapped in. Each picker tries the
// metric path BOTH at the root AND under these nested parents.
const ENVELOPES = ["", "data.", "snapshot.", "coinglass.", "metrics.", "market."];

function pathsAcrossEnvelopes(suffixes: string[]): string[] {
  const out: string[] = [];
  for (const env of ENVELOPES) {
    for (const s of suffixes) out.push(`${env}${s}`);
  }
  return out;
}

function pickBtcPrice(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "btc_price",
      "btc.price",
      "btc.last_price",
      "btc.price_usd",
      "btc_price_usd",
      "price.btc",
      "prices.btc",
    ]),
  );
}
function pickBtcChange(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "btc_change_24h_pct",
      "btc.change_24h_pct",
      "btc.change_24h",
      "btc.delta_24h_pct",
      "btc.delta_24h",
      "btc.pct_change_24h",
      "btc_24h_change",
    ]),
  );
}
function pickFng(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "fear_greed_value",
      "fear_greed.value",
      "fear_greed",
      "fng.value",
      "fng",
      "fng_value",
      "sentiment.fear_greed",
    ]),
  );
}
function pickFngLabel(raw: unknown): string | null {
  return pickString(
    raw,
    pathsAcrossEnvelopes([
      "fear_greed_label",
      "fear_greed.label",
      "fng.label",
      "fng_label",
    ]),
  );
}
function pickOi(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "oi_aggregated_usd",
      "open_interest.aggregated_usd",
      "open_interest.aggregated",
      "open_interest.usd",
      "open_interest_usd",
      "oi.aggregated_usd",
      "oi.aggregated",
      "oi.usd",
      "oi_usd",
      "futures_oi",
    ]),
  );
}
function pickOiDelta(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "oi_delta_24h_pct",
      "open_interest.delta_24h_pct",
      "open_interest.delta_24h",
      "open_interest.change_24h_pct",
      "open_interest.change_24h",
      "oi.delta_24h_pct",
      "oi.delta_24h",
      "oi.change_24h_pct",
      "oi.change_24h",
      "oi_change_24h_pct",
      "oi_24h_change",
    ]),
  );
}
function pickFunding(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "funding_rate",
      "funding.rate",
      "funding.rate_8h",
      "funding.avg",
      "funding.average",
      "funding_avg",
      "funding_rate_avg",
      "perp_funding",
      "perp_funding_rate",
      "btc_funding",
      "btc_funding_rate",
      "funding.btc",
      "funding.btc_rate",
    ]),
  );
}
function pickLsr(raw: unknown): number | null {
  return pickNumber(
    raw,
    pathsAcrossEnvelopes([
      "long_short_ratio",
      "lsr",
      "ls_ratio",
      "long_short_ratio.value",
      "lsr.value",
      "ls_ratio.value",
      "long_short_ratio.global",
      "long_short_ratio.btc",
      "global_long_short_ratio",
      "ls_ratio.global",
      "position_ratio.long_short",
    ]),
  );
}

function pickGeneratedAt(raw: unknown): string | null {
  return pickString(
    raw,
    pathsAcrossEnvelopes([
      "generated_at",
      "updated_at",
      "fetched_at",
      "timestamp",
      "as_of",
    ]),
  );
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
    generatedAt: pickGeneratedAt(raw),
    fetchedAt,
  };
}
