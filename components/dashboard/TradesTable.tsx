import type { PublicTrade } from "@/lib/dal";

function formatNumber(n: number | null, digits = 2) {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPct(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(2)}%`;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TradesTable({
  trades,
  emptyMessage,
}: {
  trades: PublicTrade[];
  emptyMessage: string;
}) {
  if (trades.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left">Symbol</th>
            <th scope="col" className="px-4 py-3 text-left">Side</th>
            <th scope="col" className="px-4 py-3 text-right">Entry</th>
            <th scope="col" className="px-4 py-3 text-right">Exit</th>
            <th scope="col" className="px-4 py-3 text-right">ROI</th>
            <th scope="col" className="px-4 py-3 text-right">Closed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {trades.map((t) => {
            const positive = t.roi !== null && t.roi >= 0;
            return (
              <tr key={t.id}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {t.symbol}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={[
                      "inline-flex rounded-md px-2 py-0.5 font-mono text-[11px] uppercase",
                      t.side === "long"
                        ? "bg-emerald/10 text-emerald"
                        : "bg-red-500/10 text-red-300",
                    ].join(" ")}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {formatNumber(t.entry)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  {formatNumber(t.exit)}
                </td>
                <td
                  className={[
                    "px-4 py-3 text-right font-mono",
                    t.roi === null
                      ? "text-muted-foreground"
                      : positive
                        ? "text-emerald"
                        : "text-red-300",
                  ].join(" ")}
                >
                  {formatPct(t.roi)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {formatTime(t.closed_at)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
