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
}

export interface PaulsTrade extends CommonTrade {
  owner: "paul";
  pnlR: number;
  reasoning: string | null;
}

export type AnyTrade = YourTrade | PaulsTrade;

export interface TradesView {
  your: { active: YourTrade[]; recent: YourTrade[] };
  pauls: { active: PaulsTrade[]; recent: PaulsTrade[] };
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
  const pnlR = num(readField(t, ["r_multiple", "r", "r_value"])) ?? 0;
  const reasoning = str(readField(t, ["reasoning", "notes", "thesis"]));
  return { ...base, owner: "paul", pnlR, reasoning };
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

  // Snapshot legacy path: if public_trades is a flat array and all entries are
  // "closed", treat them as recent. Backend should expose active/recent split
  // explicitly going forward.
  return {
    your: { active: ownActive, recent: ownRecent },
    pauls: { active: paulActive, recent: paulRecent },
    fetchedAt,
  };
}
