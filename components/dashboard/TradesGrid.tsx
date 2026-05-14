import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconUserCheck,
} from "@tabler/icons-react";
import type { MockTrade } from "@/lib/mock-dashboard";

function formatNumber(n: number, digits = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPnlPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function formatPnlR(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}R`;
}

function TradeRow({
  trade,
  hideSize = false,
  showLiqDistance = false,
}: {
  trade: MockTrade;
  hideSize?: boolean;
  showLiqDistance?: boolean;
}) {
  const positive = trade.pnlPct >= 0;
  const Icon = positive ? IconArrowUpRight : IconArrowDownRight;
  const tone = positive ? "text-emerald" : "text-red-300";

  return (
    <button
      type="button"
      className="grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left transition-colors hover:border-foreground/20 sm:grid-cols-[1.2fr_auto_auto]"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-mono text-sm font-semibold text-foreground">
            {trade.symbol}
          </p>
          <span
            className={[
              "inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[10px] uppercase",
              trade.side === "long"
                ? "bg-emerald/[0.1] text-emerald"
                : "bg-red-500/[0.1] text-red-300",
            ].join(" ")}
          >
            {trade.side}
          </span>
          {!hideSize && trade.size && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {trade.size}
            </span>
          )}
        </div>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          {trade.status === "open" && trade.mark
            ? `${formatNumber(trade.entry)} → ${formatNumber(trade.mark)} · ${trade.durationLabel}`
            : trade.status === "closed" && trade.exit
              ? `${formatNumber(trade.entry)} → ${formatNumber(trade.exit)} · ${trade.durationLabel}`
              : trade.durationLabel}
          {showLiqDistance && trade.liquidationDistancePct !== undefined && (
            <span className="ml-2 text-emerald">
              {trade.liquidationDistancePct}% to liq
            </span>
          )}
        </p>
      </div>

      <div className={`text-right font-mono text-sm font-semibold ${tone}`}>
        <div className="flex items-center justify-end gap-1">
          <Icon size={14} stroke={2} />
          {formatPnlPct(trade.pnlPct)}
        </div>
      </div>
      <div className={`hidden text-right font-mono text-sm ${tone} sm:block`}>
        {formatPnlR(trade.pnlR)}
      </div>
    </button>
  );
}

interface SectionProps {
  title: string;
  active: MockTrade[];
  recent: MockTrade[];
  hideSize?: boolean;
  showLiqDistance?: boolean;
  emptyMessage: string;
  badge?: React.ReactNode;
}

function TradesSection({
  title,
  active,
  recent,
  hideSize = false,
  showLiqDistance = false,
  emptyMessage,
  badge,
}: SectionProps) {
  const empty = active.length === 0 && recent.length === 0;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {badge}
      </div>

      {empty ? (
        <p className="rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Active
              </p>
              <div className="space-y-1.5">
                {active.map((t) => (
                  <TradeRow
                    key={t.id}
                    trade={t}
                    hideSize={hideSize}
                    showLiqDistance={showLiqDistance}
                  />
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Recent — last 5 closed
              </p>
              <div className="space-y-1.5">
                {recent.map((t) => (
                  <TradeRow key={t.id} trade={t} hideSize={hideSize} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface Props {
  yourTrades: { active: MockTrade[]; recent: MockTrade[] };
  paulsTrades: { active: MockTrade[]; recent: MockTrade[] };
}

export function TradesGrid({ yourTrades, paulsTrades }: Props) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TradesSection
        title="Your trades"
        active={yourTrades.active}
        recent={yourTrades.recent}
        showLiqDistance
        emptyMessage="No trades yet — when you start trading, your positions appear here."
      />
      <TradesSection
        title="Paul's trades"
        active={paulsTrades.active}
        recent={paulsTrades.recent}
        hideSize
        emptyMessage="No active positions from Paul right now."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
            <IconUserCheck size={12} stroke={2} />
            Following Paul
          </span>
        }
      />
    </div>
  );
}
