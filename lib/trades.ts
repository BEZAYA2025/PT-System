// Defensive adapter for trades — Your-Trades vs Paul's-Trades have different
// privacy contracts:
//   YourTrade  → USD PnL allowed, NO R-multiple shown
//   PaulsTrade → NO USD PnL (privacy), R-multiple shown, optional reasoning
//
// Backend shape isn't pinned yet, so each picker reads several plausible
// paths. Update the picker bodies once the VPS payload is observed.

export type TradeSide = "long" | "short";
export type TradeStatus = "open" | "closed";

interface CommonTrade {
  id: string;
  symbol: string;
  side: TradeSide;
  status: TradeStatus;
  entry: number;
  mark: number | null; // null when closed
  exit: number | null; // null when open
  pnlPct: number;
  slPrice: number | null;
  tpPrice: number | null;
  /** Magnitude of "% away from current mark" — undefined when SL not set / closed. */
  slDistancePct: number | null;
  tpDistancePct: number | null;
  openedAt: string;
  closedAt: string | null;
  durationLabel: string;
}

export interface YourTrade extends CommonTrade {
  owner: "self";
  pnlUsd: number;
  /** Initial margin posted on the position (notional / leverage).
   *  Used to compute Unrealized PnL %. Null when backend doesn't ship it
   *  — the % display gracefully hides in that case. */
  marginUsd?: number | null;
  /** Position size in base-asset units. Round-15: drives the SL$ /
   *  TP$ "would-lose / would-gain" math in the Top-Card and modal.
   *  Picker reads qty / quantity / size / position_size (snake + camel). */
  qty?: number | null;
  leverage?: number | null;
  tradeNumber?: number | null;
}

export interface PaulsTrade extends CommonTrade {
  owner: "paul";
  /** R-multiple may be absent on the new /api/cockpit/paul-trades feed;
   *  UI hides the column when null. */
  pnlR: number | null;
  reasoning: string | null;
  /** Confluence score from the new endpoint (0..1). Surface in detail view. */
  score?: number | null;
  /** Leverage from the new endpoint — shown as size pill when present. */
  leverage?: number | null;
  /** Paul's sequential trade number — informational, future detail use. */
  tradeNumber?: number | null;
  /** True when backend has a written analysis available for deep dive. */
  hasAnalysis?: boolean;
}

export type AnyTrade = YourTrade | PaulsTrade;

/** Member-side metadata for the empty-state copy. */
export interface YourTradesMeta {
  hasExchange: boolean;
  exchangeType: string | null;
  /** Round-14c: VPS now mirrors `credential_status` on `/api/cockpit/
   *  my-trades` too, so the 5s poll carries the freshest signal
   *  without a separate `/api/auth/me` round-trip. */
  credentialStatus: import("@/lib/dal").CredentialStatus | null;
}

/** Cumulative stats for the section header / top-cards. Backend may
 *  expose them under `stats.*`; falls back to derive-from-recent when
 *  the field is absent. */
export interface TradesStats {
  /** Sum of live unrealized PnL across all currently-open positions
   *  (member-side only — Paul's response strips USD server-side). */
  unrealizedPnlSum: number | null;
  /** Aggregate unrealized PnL as a % of total margin posted — i.e.
   *  "Your open book is +X% right now". Null when margin data isn't
   *  available so the % chip can hide gracefully. */
  unrealizedPnlPct: number | null;
  realizedPnlSum: number | null;
  winRatePct: number | null;
  closedCount: number | null;
}

export interface TradesView {
  your: {
    active: YourTrade[];
    recent: YourTrade[];
    stats: TradesStats;
  };
  pauls: {
    active: PaulsTrade[];
    recent: PaulsTrade[];
    stats: TradesStats;
  };
  yourMeta?: YourTradesMeta;
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// SL/TP exposure math — Round-15.
//
// Member-visible signal: "if SL hits → you'd lose $X, if TP hits → you'd
// gain $Y". Computed from (price - entry) * qty * sideSign so the sign
// is correct for both long and short.
//
// Returns null when qty is missing (backend didn't ship it AND notional
// fallback didn't fire) so the consumer can degrade gracefully instead
// of rendering a confidently-wrong "$0" value.
// ---------------------------------------------------------------------------

/** $ outcome if `target` price hits, signed against the trade side. */
export function pnlAtPrice(
  trade: YourTrade,
  target: number | null,
): number | null {
  if (target === null || trade.qty === null || trade.qty === undefined) {
    return null;
  }
  const sideSign = trade.side === "long" ? 1 : -1;
  return (target - trade.entry) * trade.qty * sideSign;
}

/** % distance from the live mark to `target`. Signed against side so the
 *  output reads naturally: SL distance comes out negative (you have to
 *  drop to lose), TP distance positive (you have to rise to win). */
export function pctDistanceFromMark(
  trade: YourTrade,
  target: number | null,
): number | null {
  if (target === null || trade.mark === null || trade.mark <= 0) {
    return null;
  }
  const sideSign = trade.side === "long" ? 1 : -1;
  return ((target - trade.mark) / trade.mark) * 100 * sideSign;
}

/** Aggregate SL/TP exposure across all open trades. Used by the
 *  Top-Card to show a single line summary without per-trade rendering. */
export function aggregateExposure(open: YourTrade[]): {
  slLossUsd: number | null;
  tpGainUsd: number | null;
} {
  let slLoss = 0;
  let tpGain = 0;
  let slHasAny = false;
  let tpHasAny = false;
  for (const t of open) {
    const sl = pnlAtPrice(t, t.slPrice);
    if (sl !== null) {
      slLoss += sl;
      slHasAny = true;
    }
    const tp = pnlAtPrice(t, t.tpPrice);
    if (tp !== null) {
      tpGain += tp;
      tpHasAny = true;
    }
  }
  return {
    slLossUsd: slHasAny ? slLoss : null,
    tpGainUsd: tpHasAny ? tpGain : null,
  };
}

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

// Backend BIGINT columns (trade_number, sequence ids) come over JSON as
// strings to avoid JS-number precision loss. `num()` rejects strings
// outright, so the call sites for those fields use this looser parser
// instead. Returns null on anything that isn't a positive-integer
// number or a string that parses cleanly to one.
const numOrIntString = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed === "") return null;
    const n = Number(trimmed);
    if (Number.isFinite(n) && Number.isInteger(n)) return n;
  }
  return null;
};

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

function lowerSide(v: unknown): TradeSide {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  return s === "short" || s === "sell" ? "short" : "long";
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function pickArrayPath(raw: unknown, paths: string[][]): unknown[] {
  if (!raw || typeof raw !== "object") return [];
  for (const path of paths) {
    let cur: unknown = raw;
    for (const key of path) {
      if (cur && typeof cur === "object" && key in cur) {
        cur = (cur as Record<string, unknown>)[key];
      } else {
        cur = null;
        break;
      }
    }
    if (Array.isArray(cur) && cur.length > 0) return cur;
  }
  return [];
}

function durationFromOpened(openedAt: string | null, closedAt: string | null): string {
  if (!openedAt) return "—";
  try {
    const start = new Date(openedAt).getTime();
    const end = closedAt ? new Date(closedAt).getTime() : Date.now();
    let ms = Math.max(0, end - start);
    const days = Math.floor(ms / (24 * 60 * 60 * 1000));
    ms -= days * 24 * 60 * 60 * 1000;
    const hrs = Math.floor(ms / (60 * 60 * 1000));
    ms -= hrs * 60 * 60 * 1000;
    const mins = Math.floor(ms / (60 * 1000));
    if (days > 0) return `${days}d ${hrs}h`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  } catch {
    return "—";
  }
}

function computeDistancePct(
  mark: number | null,
  target: number | null,
): number | null {
  if (mark === null || target === null || mark === 0) return null;
  return Math.abs((target - mark) / mark) * 100;
}

function readField<T>(t: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (k in t) return t[k];
  }
  return undefined;
}

function shapeCommon(raw: unknown, fallbackId: string): CommonTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;

  const symbol = str(readField(t, ["symbol", "pair", "instrument"]));
  if (!symbol) return null;

  const status: TradeStatus =
    str(readField(t, ["status"]))?.toLowerCase() === "closed"
      ? "closed"
      : str(readField(t, ["closed_at", "closedAt"]))
        ? "closed"
        : "open";

  const entry = num(readField(t, ["entry_price", "entry", "open_price"]));
  if (entry === null) return null;

  const mark = num(readField(t, ["mark_price", "mark", "current_price"]));
  const exit = num(readField(t, ["exit_price", "exit", "close_price"]));
  const slPrice = num(readField(t, ["stop_loss", "sl", "sl_price"]));
  const tpPrice = num(readField(t, ["take_profit", "tp", "tp_price"]));
  const openedAt =
    str(readField(t, ["opened_at", "openedAt", "open_time", "created_at"])) ??
    "";
  const closedAt = str(readField(t, ["closed_at", "closedAt", "close_time"]));

  const referencePrice = status === "open" ? mark : exit;

  // Reverted self-compute fallback — see shapePaulEndpointOne comment.
  // Backend's roi_pct on this endpoint family is already margin-ROI
  // (verified post-revert against Paul's Trade #5 which read +3.02%
  // correctly with the simple chain).
  const pnlPct =
    num(
      readField(t, [
        "margin_roi_pct",
        "realized_pnl_pct",
        "roi_pct",
        "pnl_pct",
        "roi",
      ]),
    ) ?? 0;

  return {
    id: str(readField(t, ["id", "trade_id"])) ?? fallbackId,
    symbol,
    side: lowerSide(readField(t, ["side", "direction"])),
    status,
    entry,
    mark: status === "open" ? mark : null,
    exit: status === "closed" ? exit : null,
    pnlPct,
    slPrice,
    tpPrice,
    slDistancePct:
      status === "open" ? computeDistancePct(referencePrice, slPrice) : null,
    tpDistancePct:
      status === "open" ? computeDistancePct(referencePrice, tpPrice) : null,
    openedAt,
    closedAt,
    durationLabel: durationFromOpened(openedAt, closedAt),
  };
}

function shapeYourOne(raw: unknown, fallbackId: string): YourTrade | null {
  const base = shapeCommon(raw, fallbackId);
  if (!base) return null;
  const t = raw as Record<string, unknown>;
  const pnlUsd =
    num(readField(t, ["realized_pnl_usd", "pnl_usd", "pnl", "unrealized_pnl"])) ??
    0;
  return { ...base, owner: "self", pnlUsd };
}

function shapePaulOne(raw: unknown, fallbackId: string): PaulsTrade | null {
  const base = shapeCommon(raw, fallbackId);
  if (!base) return null;
  const t = raw as Record<string, unknown>;
  const pnlR = num(readField(t, ["r_multiple", "r", "r_value"]));
  const reasoning = str(readField(t, ["reasoning", "notes", "thesis"]));
  return { ...base, owner: "paul", pnlR, reasoning };
}

function durationFromSeconds(sec: number | null): string {
  if (sec === null || sec <= 0) return "—";
  const days = Math.floor(sec / 86400);
  const hrs = Math.floor((sec - days * 86400) / 3600);
  const mins = Math.floor((sec - days * 86400 - hrs * 3600) / 60);
  if (days > 0) return `${days}d ${hrs}h`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

/**
 * Shape a single entry from the dedicated /api/cockpit/paul-trades feed.
 * Response items: { id, trade_number, symbol, side, leverage, entry, exit,
 *   sl, tp, roi_pct, score, status, opened_at, duration_seconds, has_analysis }
 * No USD field present — privacy stripped server-side.
 */
function shapePaulEndpointOne(
  raw: unknown,
  fallbackId: string,
): PaulsTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;

  const symbol = str(t.symbol);
  if (!symbol) return null;

  const entry = num(t.entry);
  if (entry === null) return null;

  const status: TradeStatus =
    str(t.status)?.toLowerCase() === "closed" ? "closed" : "open";
  const exit = num(t.exit);
  const sl = num(t.sl);
  const tp = num(t.tp);
  const openedAt = str(t.opened_at) ?? "";
  const durationSec = num(t.duration_seconds);

  // Endpoint doesn't include closed_at — derive from opened_at + duration.
  const closedAt =
    status === "closed" && openedAt && durationSec !== null
      ? (() => {
          try {
            const startMs = new Date(openedAt).getTime();
            if (!Number.isFinite(startMs)) return null;
            return new Date(startMs + durationSec * 1000).toISOString();
          } catch {
            return null;
          }
        })()
      : null;

  const durationLabel =
    durationSec !== null && durationSec > 0
      ? durationFromSeconds(durationSec)
      : durationFromOpened(openedAt, closedAt);

  const idRaw = t.id ?? t.trade_id;
  const id =
    typeof idRaw === "number"
      ? String(idRaw)
      : typeof idRaw === "string"
        ? idRaw
        : fallbackId;

  // Reverted: self-compute margin-ROI from entry/exit/leverage was
  // wrong — Paul saw Trade #5 render +169.40% when true margin-ROI
  // was +3.02% (factor ~56, smells like double-leverage). Backend
  // already ships the correct margin-ROI in `roi_pct` for this
  // endpoint when margin_roi_pct is absent. Trust it. If a specific
  // trade later shows pre-leverage asset-ROI, that's a backend issue
  // to clarify — the FE shouldn't second-guess with a self-multiply
  // that doubles the leverage applied. Dev-mode console.warn fires
  // for closed trades so the next diagnosis has the raw fields.
  if (
    process.env.NODE_ENV !== "production" &&
    status === "closed" &&
    typeof console !== "undefined"
  ) {
    // eslint-disable-next-line no-console
    console.warn("[paul-trades] roi fields", {
      id: t.id ?? t.trade_id,
      symbol: t.symbol,
      side: t.side,
      entry: t.entry,
      exit: t.exit,
      leverage: t.leverage,
      margin_roi_pct: t.margin_roi_pct,
      roi_pct: t.roi_pct,
    });
  }
  const pnlPct = num(t.margin_roi_pct) ?? num(t.roi_pct) ?? 0;

  return {
    id,
    owner: "paul",
    symbol,
    side: lowerSide(t.side),
    status,
    entry,
    mark: null, // endpoint doesn't expose live mark price
    exit: status === "closed" ? exit : null,
    pnlPct,
    pnlR: null,
    slPrice: sl,
    tpPrice: tp,
    slDistancePct: null, // no mark → can't compute
    tpDistancePct: null,
    openedAt,
    closedAt,
    durationLabel,
    reasoning: null,
    score: num(t.score),
    leverage: num(t.leverage),
    tradeNumber: numOrIntString(t.trade_number),
    hasAnalysis: t.has_analysis === true,
  };
}

/**
 * Shape a single entry from the dedicated /api/cockpit/my-trades feed.
 * Mirrors shapePaulEndpointOne but preserves USD PnL (member sees their
 * own absolute money).
 */
function shapeMyEndpointOne(
  raw: unknown,
  fallbackId: string,
): YourTrade | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;

  const symbol = str(t.symbol);
  if (!symbol) return null;

  const entry = num(t.entry) ?? num(t.entry_price);
  if (entry === null) return null;

  const status: TradeStatus =
    str(t.status)?.toLowerCase() === "closed" ? "closed" : "open";
  const exit = num(t.exit) ?? num(t.exit_price);
  // Round-14c (verified): chains validated against the VPS
  // field-reference. Backend-confirmed aliases listed first; the
  // camelCase + extra variants below them stay as defensive cover
  // for any single-adapter drift inside the multi-tenant adapter.
  //
  // SL  ← stop_loss | sl_price | sl
  // TP  ← take_profit | take_profit_1 | tp_price | tp1
  //       (take_profit_2/3 + tp2/tp3 are multi-TP — not rendered yet)
  // Mark ← mark_price | mark_price_usd | current_price | last_mark_price
  const sl =
    num(t.stop_loss) ??
    num(t.sl_price) ??
    num(t.sl) ??
    num(t.stop_loss_price) ??
    num(t.stopLoss) ??
    num(t.stopLossPrice);
  const tp =
    num(t.take_profit) ??
    num(t.take_profit_1) ??
    num(t.tp_price) ??
    num(t.tp1) ??
    num(t.tp) ??
    num(t.take_profit_price) ??
    num(t.takeProfit) ??
    num(t.takeProfit1) ??
    num(t.takeProfitPrice);
  const mark =
    num(t.mark_price) ??
    num(t.mark_price_usd) ??
    num(t.current_price) ??
    num(t.last_mark_price) ??
    num(t.mark) ??
    num(t.last_price) ??
    num(t.market_price) ??
    num(t.markPrice) ??
    num(t.markPriceUsd) ??
    num(t.currentPrice) ??
    num(t.lastMarkPrice) ??
    num(t.lastPrice);
  const openedAt = str(t.opened_at) ?? "";
  const durationSec = num(t.duration_seconds);

  const closedAt =
    status === "closed" && openedAt && durationSec !== null
      ? (() => {
          try {
            const startMs = new Date(openedAt).getTime();
            if (!Number.isFinite(startMs)) return null;
            return new Date(startMs + durationSec * 1000).toISOString();
          } catch {
            return null;
          }
        })()
      : null;

  const durationLabel =
    durationSec !== null && durationSec > 0
      ? durationFromSeconds(durationSec)
      : durationFromOpened(openedAt, closedAt);

  // Status-aware PnL picker. The previous round-14c chain put
  // `unrealized_pnl_usd` FIRST regardless of status; backends ship
  // `unrealized_pnl_usd: 0` on closed trades (the position no longer
  // has unrealized P&L), so the realized sum on the Top-Card came in
  // as 0 even when `realized_pnl_usd` carried the real outcome.
  //
  // Open trades → prefer `unrealized_pnl_usd` (live mark P&L).
  // Closed trades → prefer `realized_pnl_usd` (final outcome).
  // `pnl_usd` and `pnl` stay as last-resort generic fallbacks for
  // adapters that don't distinguish.
  const pnlUsd =
    status === "closed"
      ? (num(t.realized_pnl_usd) ??
          num(t.realizedPnlUsd) ??
          num(t.pnl_usd) ??
          num(t.pnlUsd) ??
          num(t.pnl) ??
          // Defensive: some adapters keep the final value in the
          // unrealized field after close. Last-resort fallback —
          // never the primary path for closed trades.
          num(t.unrealized_pnl_usd) ??
          num(t.last_unrealized_pnl_usd) ??
          num(t.unrealizedPnlUsd) ??
          num(t.lastUnrealizedPnlUsd) ??
          0)
      : (num(t.unrealized_pnl_usd) ??
          num(t.last_unrealized_pnl_usd) ??
          num(t.unrealizedPnlUsd) ??
          num(t.lastUnrealizedPnlUsd) ??
          num(t.pnl_usd) ??
          num(t.pnlUsd) ??
          num(t.pnl) ??
          // Defensive: realized field shouldn't appear on open trades
          // but keep as last-resort so a backend that misuses the
          // schema still renders something.
          num(t.realized_pnl_usd) ??
          num(t.realizedPnlUsd) ??
          0);

  // Margin posted on the position — drives the Unrealized PnL %
  // top-card. Many backend payloads carry it under different names;
  // fall back to notional/leverage when the explicit field is missing.
  const marginUsd =
    num(t.margin_usd) ??
    num(t.margin) ??
    num(t.initial_margin) ??
    num(t.position_margin) ??
    (() => {
      const notional = num(t.notional) ?? num(t.position_size_usd);
      const lev = num(t.leverage);
      if (notional !== null && lev !== null && lev > 0) {
        return notional / lev;
      }
      return null;
    })();

  // Round-15: position size in base-asset units (e.g. BTC qty, not
  // USD). Powers the SL/TP $ math. Same defensive pattern as the
  // other pickers — backend field can be qty / quantity / size /
  // position_size / entry_qty (Round-18 alias spotted in production).
  // If none match, derive from notional / entry; if that also fails,
  // leave null and the $ math degrades gracefully.
  const qty =
    num(t.qty) ??
    num(t.quantity) ??
    num(t.size) ??
    num(t.position_size) ??
    num(t.entry_qty) ??
    num(t.contract_size) ??
    num(t.positionSize) ??
    num(t.entryQty) ??
    num(t.contractSize) ??
    (() => {
      const notional = num(t.notional) ?? num(t.position_size_usd);
      if (notional !== null && entry > 0) return notional / entry;
      return null;
    })();

  const referencePrice = status === "open" ? mark : exit;

  const idRaw = t.id ?? t.trade_id;
  const id =
    typeof idRaw === "number"
      ? String(idRaw)
      : typeof idRaw === "string"
        ? idRaw
        : fallbackId;

  return {
    id,
    owner: "self",
    symbol,
    side: lowerSide(t.side),
    status,
    entry,
    mark: status === "open" ? mark : null,
    exit: status === "closed" ? exit : null,
    pnlUsd,
    marginUsd,
    qty,
    // Round-14c (verified): `unrealized_pnl_pct` is the VPS-confirmed
    // per-trade field for open positions. Closed trades typically
    // expose `roi_pct` / `realized_pnl_pct` instead — picker stacks
    // both groups with the open-trade field first because
    // `??` short-circuits on the first non-null value, so closed
    // trades whose unrealized_pnl_pct is missing/null still reach the
    // closed-trade alias. Mark-based fallback handles the case where
    // none of the percent fields ship at all.
    // Sprint 7 ROI fix v2: margin_roi_pct must lead the stack —
    // backend may ship BOTH unrealized_pnl_pct (legacy asset-ROI,
    // pre-leverage) AND margin_roi_pct (leverage-aware). The v1
    // ordering put margin_roi_pct second, so the legacy field
    // won and the per-trade card rendered asset-ROI while the
    // top-card (which computes pnl_usd / margin_usd) stayed
    // correct. Mark-based fallback at the end still handles the
    // case where no per-trade percent ships at all.
    pnlPct:
      num(t.margin_roi_pct) ??
      num(t.unrealized_pnl_pct) ??
      num(t.roi_pct) ??
      num(t.realized_pnl_pct) ??
      num(t.unrealizedPnlPct) ??
      num(t.roiPct) ??
      num(t.realizedPnlPct) ??
      (() => {
        const ref = status === "open" ? mark : exit;
        if (entry <= 0 || ref === null) return 0;
        const sideSign = lowerSide(t.side) === "long" ? 1 : -1;
        return ((ref - entry) / entry) * 100 * sideSign;
      })(),
    slPrice: sl,
    tpPrice: tp,
    slDistancePct:
      status === "open" ? computeDistancePct(referencePrice, sl) : null,
    tpDistancePct:
      status === "open" ? computeDistancePct(referencePrice, tp) : null,
    openedAt,
    closedAt,
    durationLabel,
    leverage: num(t.leverage),
    tradeNumber: numOrIntString(t.trade_number),
  };
}

/**
 * Pull cumulative stats from a feed response. Reads backend's `stats`
 * envelope first; falls back to deriving from the supplied recent array
 * (which is capped at 5 → realizedPnlSum / closedCount may understate
 * when backend doesn't expose the totals).
 */
function extractStats(
  raw: Record<string, unknown> | null,
  recent: Array<{ pnlPct: number; pnlUsd?: number }>,
  open: Array<{
    pnlUsd?: number;
    pnlPct?: number;
    marginUsd?: number | null;
  }> = [],
): TradesStats {
  const fromStatsEnvelope =
    raw && typeof raw.stats === "object" && raw.stats !== null
      ? (raw.stats as Record<string, unknown>)
      : null;

  // Per-trade sums — used both as the fallback when the stats envelope
  // is missing AND as the source-of-truth for unrealizedPnlPct (which
  // the envelope rarely exposes).
  const wins = recent.filter((t) => t.pnlPct > 0).length;
  const usdRealizedTrades = recent.reduce(
    (a, t) => a + (t.pnlUsd ?? 0),
    0,
  );
  const usdUnrealizedTrades = open.reduce(
    (a, t) => a + (t.pnlUsd ?? 0),
    0,
  );
  const usdMarginTrades = open.reduce(
    (a, t) => a + (t.marginUsd ?? 0),
    0,
  );
  const hasRealizedUsd = recent.some(
    (t) => typeof t.pnlUsd === "number",
  );
  const hasUnrealizedUsd = open.some(
    (t) => typeof t.pnlUsd === "number",
  );
  const hasMarginUsd = open.some(
    (t) => typeof t.marginUsd === "number" && (t.marginUsd ?? 0) > 0,
  );

  // Envelope is preferred for the aggregates the backend pre-computes
  // (winRatePct, closedCount, realized totals). Unrealized falls
  // through to the per-trade sum if the envelope doesn't carry a fresh
  // figure — Round-14c context: production envelope was missing both
  // open_unrealized_pnl_usd and unrealized_pnl_usd, so the card showed
  // "—" despite a live open position.
  const envUnrealized = fromStatsEnvelope
    ? (num(fromStatsEnvelope.open_unrealized_pnl_usd) ??
        num(fromStatsEnvelope.last_unrealized_pnl_usd) ??
        num(fromStatsEnvelope.unrealized_pnl_usd) ??
        num(fromStatsEnvelope.openUnrealizedPnlUsd) ??
        num(fromStatsEnvelope.lastUnrealizedPnlUsd) ??
        num(fromStatsEnvelope.unrealizedPnlUsd))
    : null;
  const envRealized = fromStatsEnvelope
    ? (num(fromStatsEnvelope.realized_pnl_usd) ??
        num(fromStatsEnvelope.realized_pnl_sum))
    : null;
  const envWinPct = fromStatsEnvelope
    ? (() => {
        const pct = num(fromStatsEnvelope.win_rate_pct);
        if (pct !== null) return pct;
        const ratio = num(fromStatsEnvelope.win_rate);
        if (ratio === null) return null;
        // Tolerate the legacy 0..1 ratio by auto-scaling.
        return ratio <= 1.5 ? ratio * 100 : ratio;
      })()
    : null;
  const envClosed = fromStatsEnvelope
    ? (num(fromStatsEnvelope.closed_count) ??
        num(fromStatsEnvelope.total_closed))
    : null;

  const unrealizedPnlSum =
    envUnrealized ?? (hasUnrealizedUsd ? usdUnrealizedTrades : null);

  // % = aggregate unrealized / aggregate posted margin. This is the
  // margin-weighted ROI of the whole open book — most meaningful when
  // backend ships margin per trade.
  // Round-17 fallback: when no trade carries margin, average the
  // per-trade pnlPct. Less accurate for unevenly-sized positions but
  // better than rendering "—" when the backend at least exposes the
  // per-trade unrealized_pnl_pct.
  let unrealizedPnlPct: number | null = null;
  if (
    unrealizedPnlSum !== null &&
    hasMarginUsd &&
    usdMarginTrades > 0
  ) {
    unrealizedPnlPct = (unrealizedPnlSum / usdMarginTrades) * 100;
  } else if (open.length > 0) {
    const pcts = open
      .map((t) => t.pnlPct)
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p));
    if (pcts.length > 0) {
      unrealizedPnlPct = pcts.reduce((a, p) => a + p, 0) / pcts.length;
    }
  }

  return {
    unrealizedPnlSum,
    unrealizedPnlPct,
    realizedPnlSum:
      envRealized ?? (hasRealizedUsd ? usdRealizedTrades : null),
    winRatePct:
      envWinPct ?? (recent.length > 0 ? (wins / recent.length) * 100 : null),
    closedCount:
      envClosed ?? (recent.length > 0 ? recent.length : null),
  };
}

/**
 * Shape the dedicated /api/cockpit/my-trades response. Empty + has_exchange=false
 * is the cold-start state for unconnected members.
 */
export function shapeMyTrades(raw: unknown): {
  active: YourTrade[];
  recent: YourTrade[];
  stats: TradesStats;
  hasExchange: boolean;
  exchangeType: string | null;
  credentialStatus: import("@/lib/dal").CredentialStatus | null;
} {
  if (!raw || typeof raw !== "object") {
    return {
      active: [],
      recent: [],
      stats: {
        unrealizedPnlSum: null,
        unrealizedPnlPct: null,
        realizedPnlSum: null,
        winRatePct: null,
        closedCount: null,
      },
      hasExchange: false,
      exchangeType: null,
      credentialStatus: null,
    };
  }
  const t = raw as Record<string, unknown>;
  const open = Array.isArray(t.open) ? t.open : [];
  const closed = Array.isArray(t.closed) ? t.closed : [];

  const active = open
    .map((x, i) => shapeMyEndpointOne(x, `my-open-${i}`))
    .filter((x): x is YourTrade => x !== null);
  // Round-22b realized-PnL fix: shape every closed trade, then take
  // a 5-item slice for the UI table. Stats are computed over the
  // FULL closed list — slicing for display before stats would
  // under-count the realized sum + win-rate whenever a member has
  // more than 5 closed trades.
  const allClosed = closed
    .map((x, i) => shapeMyEndpointOne(x, `my-closed-${i}`))
    .filter((x): x is YourTrade => x !== null);
  const recent = allClosed.slice(0, 5);

  const stats = extractStats(t, allClosed, active);

  // Round-14c (verified): VPS field-reference confirms
  // `has_exchange_connection` as the top-level field on my-trades.
  // Legacy `has_exchange` kept as a fallback for older backend deploys.
  const hasExchange =
    t.has_exchange_connection === true || t.has_exchange === true;

  const KNOWN_STATUSES: ReadonlyArray<string> = [
    "ok",
    "missing",
    "invalid_please_relink",
    "founder_env",
  ];
  const rawStatus = typeof t.credential_status === "string"
    ? t.credential_status
    : null;
  const credentialStatus =
    rawStatus !== null && KNOWN_STATUSES.includes(rawStatus)
      ? (rawStatus as import("@/lib/dal").CredentialStatus)
      : null;

  return {
    active,
    recent,
    stats,
    hasExchange,
    exchangeType:
      typeof t.exchange_type === "string" && t.exchange_type.length > 0
        ? t.exchange_type
        : null,
    credentialStatus,
  };
}

/** Shape the dedicated /api/cockpit/paul-trades response. */
export function shapePaulTrades(raw: unknown): {
  active: PaulsTrade[];
  recent: PaulsTrade[];
  stats: TradesStats;
} {
  if (!raw || typeof raw !== "object") {
    return {
      active: [],
      recent: [],
      stats: {
        unrealizedPnlSum: null,
        unrealizedPnlPct: null,
        realizedPnlSum: null,
        winRatePct: null,
        closedCount: null,
      },
    };
  }
  const t = raw as Record<string, unknown>;
  const open = Array.isArray(t.open) ? t.open : [];
  const closed = Array.isArray(t.closed) ? t.closed : [];

  const active = open
    .map((x, i) => shapePaulEndpointOne(x, `paul-open-${i}`))
    .filter((x): x is PaulsTrade => x !== null);
  const recent = closed
    .map((x, i) => shapePaulEndpointOne(x, `paul-closed-${i}`))
    .filter((x): x is PaulsTrade => x !== null)
    .slice(0, 5);

  // Paul's response strips USD server-side. Even if a USD field leaked
  // into stats, the PaulsTradesSection passes hideUsd=true so it never
  // surfaces in the UI.
  const stats = extractStats(t, recent);

  return { active, recent, stats };
}

const OWN_ACTIVE_PATHS: string[][] = [
  ["own_trades", "active"],
  ["my_trades", "active"],
  ["self_trades", "active"],
  ["open_trades"], // legacy from snapshot
  ["trades", "own", "active"],
];
const OWN_RECENT_PATHS: string[][] = [
  ["own_trades", "recent"],
  ["my_trades", "recent"],
  ["self_trades", "recent"],
  ["trades", "own", "recent"],
];
const PAUL_ACTIVE_PATHS: string[][] = [
  ["paul_trades", "active"],
  ["public_trades", "active"],
  ["trades", "paul", "active"],
];
const PAUL_RECENT_PATHS: string[][] = [
  ["paul_trades", "recent"],
  ["public_trades", "recent"],
  ["public_trades"], // legacy snapshot — recent-only
  ["trades", "paul", "recent"],
];

/** Read member-owned trades from a /api/cockpit/snapshot payload. */
export function shapeOwnTrades(snapshotRaw: unknown): {
  active: YourTrade[];
  recent: YourTrade[];
} {
  const active = pickArrayPath(snapshotRaw, OWN_ACTIVE_PATHS)
    .map((t, i) => shapeYourOne(t, `your-active-${i}`))
    .filter((t): t is YourTrade => t !== null);
  const recent = pickArrayPath(snapshotRaw, OWN_RECENT_PATHS)
    .map((t, i) => shapeYourOne(t, `your-recent-${i}`))
    .filter((t): t is YourTrade => t !== null)
    .slice(0, 5);
  return { active, recent };
}

/**
 * Combine the dedicated my-trades + paul-trades feeds into a single
 * TradesView. Either raw may be null/missing — caller will see empty
 * sections, not a crash.
 */
export function buildTradesView(
  myRaw: unknown,
  paulRaw: unknown,
  fetchedAt: number,
): TradesView {
  const my = shapeMyTrades(myRaw);
  const pauls = shapePaulTrades(paulRaw);
  return {
    your: { active: my.active, recent: my.recent, stats: my.stats },
    pauls,
    yourMeta: {
      hasExchange: my.hasExchange,
      exchangeType: my.exchangeType,
      credentialStatus: my.credentialStatus,
    },
    fetchedAt,
  };
}

/**
 * Legacy shapeTrades — kept so callers reading the snapshot for Paul's
 * trades (pre-dedicated-endpoint) compile. New code should call
 * buildTradesView.
 */
export function shapeTrades(raw: unknown, fetchedAt: number): TradesView {
  const ownActive = pickArrayPath(raw, OWN_ACTIVE_PATHS)
    .map((t, i) => shapeYourOne(t, `your-active-${i}`))
    .filter((t): t is YourTrade => t !== null);
  const ownRecent = pickArrayPath(raw, OWN_RECENT_PATHS)
    .map((t, i) => shapeYourOne(t, `your-recent-${i}`))
    .filter((t): t is YourTrade => t !== null)
    .slice(0, 5);

  const paulActive = pickArrayPath(raw, PAUL_ACTIVE_PATHS)
    .map((t, i) => shapePaulOne(t, `paul-active-${i}`))
    .filter((t): t is PaulsTrade => t !== null);
  const paulRecent = pickArrayPath(raw, PAUL_RECENT_PATHS)
    .map((t, i) => shapePaulOne(t, `paul-recent-${i}`))
    .filter((t): t is PaulsTrade => t !== null)
    .slice(0, 5);

  const emptyStats: TradesStats = {
    unrealizedPnlSum: null,
    unrealizedPnlPct: null,
    realizedPnlSum: null,
    winRatePct: null,
    closedCount: null,
  };
  return {
    your: { active: ownActive, recent: ownRecent, stats: emptyStats },
    pauls: { active: paulActive, recent: paulRecent, stats: emptyStats },
    fetchedAt,
  };
}
