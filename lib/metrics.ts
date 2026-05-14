// Market Pulse adapter — backend paths confirmed by VPS.
// Mixes liquidation_map (flatter, member-facing) with market_pulse
// (envelope-wrapped {fresh, error, value: {...}}). The dig() walker
// resolves both layouts via dotted paths.

export type Trend = "bullish" | "bearish" | "neutral";

export type RawSnapshotMetrics = Record<string, unknown>;

// ---------------------------------------------------------------------------
// View shapes — each metric has its own subtype so the MarketPulse card
// can render layout-specific copy (e.g. "47% L · 53% S") without leaking
// optionality into a generic MetricCard.
// ---------------------------------------------------------------------------

export interface FearGreedView {
  value: number | null;
  label: string | null;
  trend: Trend;
}

export interface FundingView {
  rate: number | null;
  /** Source label e.g. "Binance" — falls back gracefully when missing. */
  source: string | null;
  trend: Trend;
}

export interface OpenInterestView {
  usd: number | null;
  btc: number | null;
  deltaPct: number | null;
  trend: Trend;
}

export interface LsRatioView {
  value: number | null;
  longPct: number | null;
  shortPct: number | null;
  trend: Trend;
}

export interface BtcDominanceView {
  pct: number | null;
  marketCapUsd: number | null;
  trend: Trend;
}

export interface MarketPulseView {
  fearGreed: FearGreedView;
  funding: FundingView;
  openInterest: OpenInterestView;
  lsRatio: LsRatioView;
  btcDominance: BtcDominanceView;
  generatedAt: string | null;
  fetchedAt: number;
}

export interface BtcPriceView {
  price: number | null;
  changePct: number | null;
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// Per-card tooltip metadata (consumed by MetricTooltip components)
// ---------------------------------------------------------------------------

export const PULSE_TOOLTIPS = {
  fearGreed:
    "0–100 score from the alternative.me index. <25 = extreme fear, >75 = extreme greed. Contrarian signal at extremes.",
  funding:
    "8h average funding paid between longs and shorts. Positive = longs pay shorts (bullish positioning crowded). Negative = shorts pay longs.",
  openInterest:
    "Total $ value of open futures contracts across exchanges. Rising OI + rising price = real buying. Rising OI + flat price = positioning building.",
  lsRatio:
    "Ratio of long positions to short positions across major exchanges. 1.0 = neutral. >1.2 = long-heavy crowd. <0.8 = short-heavy.",
  btcDominance:
    "BTC market cap as a share of total crypto market cap. Rising dominance often signals risk-off rotation out of altcoins.",
  btcPrice:
    "Bitcoin spot price. The market's primary anchor — sets the tone for everything else.",
} as const;

// ---------------------------------------------------------------------------
// Path-walker helpers
// ---------------------------------------------------------------------------

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

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

// ---------------------------------------------------------------------------
// Pickers (confirmed paths primary, defensive fallbacks secondary)
// ---------------------------------------------------------------------------

function pickBtcPrice(raw: unknown): number | null {
  return pickNumber(raw, ["btc.price"]);
}
function pickBtcChange(raw: unknown): number | null {
  return pickNumber(raw, ["btc.change_pct"]);
}

function pickFng(raw: unknown): number | null {
  return pickNumber(raw, ["market_pulse.fear_greed.value.value"]);
}
function pickFngLabel(raw: unknown): string | null {
  return pickString(raw, ["market_pulse.fear_greed.value.classification"]);
}

function pickFundingRate(raw: unknown): number | null {
  return pickNumber(raw, [
    "btc.funding_rate",
    "market_pulse.btc_funding.value.last_funding_rate",
  ]);
}
function pickFundingSource(raw: unknown): string | null {
  return pickString(raw, [
    "btc.funding_source",
    "btc.funding_exchange",
    "market_pulse.btc_funding.value.source",
    "market_pulse.btc_funding.value.exchange",
  ]);
}

function pickOiUsd(raw: unknown): number | null {
  return pickNumber(raw, ["liquidation_map.oi_aggregated.now_usd"]);
}
function pickOiBtc(raw: unknown): number | null {
  return pickNumber(raw, [
    "liquidation_map.oi_aggregated.now_btc",
    "liquidation_map.oi_aggregated.now_base",
  ]);
}
function pickOiDelta(raw: unknown): number | null {
  return pickNumber(raw, ["liquidation_map.oi_aggregated.delta_24h_pct"]);
}

function pickLsr(raw: unknown): number | null {
  return pickNumber(raw, ["liquidation_map.ls_ratio.now"]);
}
function pickLsLongPct(raw: unknown): number | null {
  // Path confirmed by VPS round-4: liquidation_map.ls_ratio.long_pct_now
  return pickNumber(raw, [
    "liquidation_map.ls_ratio.long_pct_now",
    "liquidation_map.ls_ratio.long_share_pct",
    "liquidation_map.ls_ratio.long_pct",
  ]);
}
function pickLsShortPct(raw: unknown): number | null {
  return pickNumber(raw, [
    "liquidation_map.ls_ratio.short_pct_now",
    "liquidation_map.ls_ratio.short_share_pct",
    "liquidation_map.ls_ratio.short_pct",
  ]);
}

function pickBtcDominance(raw: unknown): number | null {
  return pickNumber(raw, [
    "liquidation_map.btc_dominance.current_dominance_pct",
    "liquidation_map.btc_dominance.now_pct",
    "liquidation_map.btc_dominance.value",
    "market_pulse.btc_dominance.value.value",
    "btc_dominance.value",
  ]);
}
function pickMarketCap(raw: unknown): number | null {
  return pickNumber(raw, [
    "liquidation_map.btc_dominance.total_market_cap_usd",
    "liquidation_map.btc_dominance.market_cap_usd",
    "liquidation_map.total_market_cap_usd",
    "market_pulse.market_cap.value.value",
    "market_pulse.btc_dominance.value.market_cap_usd",
  ]);
}

function pickGeneratedAt(raw: unknown): string | null {
  return pickString(raw, [
    "generated_at",
    "updated_at",
    "fetched_at",
    "timestamp",
  ]);
}

// ---------------------------------------------------------------------------
// Trend helpers
// ---------------------------------------------------------------------------

function trendFromFng(n: number | null): Trend {
  if (n === null) return "neutral";
  if (n >= 60) return "bullish";
  if (n <= 40) return "bearish";
  return "neutral";
}

function trendFromFunding(n: number | null): Trend {
  if (n === null) return "neutral";
  // Funding may arrive as decimal (0.0001) or already-pct.
  const pct = Math.abs(n) < 0.01 ? n * 100 : n;
  if (pct > 0.01) return "bullish";
  if (pct < -0.01) return "bearish";
  return "neutral";
}

function trendFromChange(n: number | null): Trend {
  if (n === null) return "neutral";
  if (n > 0.05) return "bullish";
  if (n < -0.05) return "bearish";
  return "neutral";
}

function trendFromLsr(n: number | null): Trend {
  if (n === null) return "neutral";
  if (n >= 1.2) return "bullish";
  if (n <= 0.85) return "bearish";
  return "neutral";
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export function buildMarketPulseView(
  raw: RawSnapshotMetrics | null,
  fetchedAt: number,
): MarketPulseView {
  const fngValue = pickFng(raw);
  const fundingRate = pickFundingRate(raw);
  const oiUsd = pickOiUsd(raw);
  const lsr = pickLsr(raw);
  const dominance = pickBtcDominance(raw);

  return {
    fearGreed: {
      value: fngValue,
      label: pickFngLabel(raw),
      trend: trendFromFng(fngValue),
    },
    funding: {
      rate: fundingRate,
      source: pickFundingSource(raw),
      trend: trendFromFunding(fundingRate),
    },
    openInterest: {
      usd: oiUsd,
      btc: pickOiBtc(raw),
      deltaPct: pickOiDelta(raw),
      trend: trendFromChange(pickOiDelta(raw)),
    },
    lsRatio: {
      value: lsr,
      longPct: pickLsLongPct(raw),
      shortPct: pickLsShortPct(raw),
      trend: trendFromLsr(lsr),
    },
    btcDominance: {
      pct: dominance,
      marketCapUsd: pickMarketCap(raw),
      trend: "neutral",
    },
    generatedAt: pickGeneratedAt(raw),
    fetchedAt,
  };
}

export function buildBtcPriceView(
  raw: RawSnapshotMetrics | null,
  fetchedAt: number,
): BtcPriceView {
  return {
    price: pickBtcPrice(raw),
    changePct: pickBtcChange(raw),
    fetchedAt,
  };
}
