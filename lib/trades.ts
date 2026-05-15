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
}

/** Cumulative stats for the section header / top-cards. Backend may
 *  expose them under `stats.*`; falls back to derive-from-recent when
 *  the field is absent. */
export interface TradesStats {
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

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

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

  return {
    id: str(readField(t, ["id", "trade_id"])) ?? fallbackId,
    symbol,
    side: lowerSide(readField(t, ["side", "direction"])),
    status,
    entry,
    mark: status === "open" ? mark : null,
    exit: status === "closed" ? exit : null,
    pnlPct:
      num(readField(t, ["realized_pnl_pct", "roi_pct", "pnl_pct", "roi"])) ??
      0,
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

  return {
    id,
    owner: "paul",
    symbol,
    side: lowerSide(t.side),
    status,
    entry,
    mark: null, // endpoint doesn't expose live mark price
    exit: status === "closed" ? exit : null,
    pnlPct: num(t.roi_pct) ?? 0,
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
    tradeNumber: num(t.trade_number),
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
  const sl = num(t.sl) ?? num(t.stop_loss);
  const tp = num(t.tp) ?? num(t.take_profit);
  const mark = num(t.mark) ?? num(t.mark_price) ?? num(t.current_price);
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

  const pnlUsd =
    num(t.pnl_usd) ??
    num(t.realized_pnl_usd) ??
    num(t.unrealized_pnl_usd) ??
    num(t.pnl) ??
    0;

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
    pnlPct: num(t.roi_pct) ?? num(t.realized_pnl_pct) ?? 0,
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
    tradeNumber: num(t.trade_number),
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
): TradesStats {
  const fromStatsEnvelope =
    raw && typeof raw.stats === "object" && raw.stats !== null
      ? (raw.stats as Record<string, unknown>)
      : null;
  if (fromStatsEnvelope) {
    const rawWin = num(fromStatsEnvelope.win_rate);
    return {
      realizedPnlSum:
        num(fromStatsEnvelope.realized_pnl_sum) ??
        num(fromStatsEnvelope.realized_pnl_usd) ??
        null,
      winRatePct:
        rawWin === null ? null : rawWin <= 1.5 ? rawWin * 100 : rawWin,
      closedCount:
        num(fromStatsEnvelope.closed_count) ??
        num(fromStatsEnvelope.total_closed) ??
        null,
    };
  }
  if (recent.length === 0) {
    return { realizedPnlSum: null, winRatePct: null, closedCount: null };
  }
  const wins = recent.filter((t) => t.pnlPct > 0).length;
  const usdTotal = recent.reduce((a, t) => a + (t.pnlUsd ?? 0), 0);
  const hasUsd = recent.some((t) => typeof t.pnlUsd === "number");
  return {
    realizedPnlSum: hasUsd ? usdTotal : null,
    winRatePct: (wins / recent.length) * 100,
    closedCount: recent.length,
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
} {
  if (!raw || typeof raw !== "object") {
    return {
      active: [],
      recent: [],
      stats: { realizedPnlSum: null, winRatePct: null, closedCount: null },
      hasExchange: false,
      exchangeType: null,
    };
  }
  const t = raw as Record<string, unknown>;
  const open = Array.isArray(t.open) ? t.open : [];
  const closed = Array.isArray(t.closed) ? t.closed : [];

  const active = open
    .map((x, i) => shapeMyEndpointOne(x, `my-open-${i}`))
    .filter((x): x is YourTrade => x !== null);
  const recent = closed
    .map((x, i) => shapeMyEndpointOne(x, `my-closed-${i}`))
    .filter((x): x is YourTrade => x !== null)
    .slice(0, 5);

  const stats = extractStats(t, recent);

  return {
    active,
    recent,
    stats,
    hasExchange: t.has_exchange === true,
    exchangeType:
      typeof t.exchange_type === "string" && t.exchange_type.length > 0
        ? t.exchange_type
        : null,
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
      stats: { realizedPnlSum: null, winRatePct: null, closedCount: null },
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

  // Paul's response strips USD server-side, so realizedPnlSum will end up
  // null in the fallback path — UI already accounts for that.
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
