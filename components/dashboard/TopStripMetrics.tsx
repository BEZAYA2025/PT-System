import {
  IconArrowUpRight,
  IconArrowDownRight,
  IconMinus,
} from "@tabler/icons-react";
import type { MetricCard, Trend } from "@/lib/mock-dashboard";

const TREND_TONE: Record<Trend, string> = {
  bullish: "text-emerald",
  bearish: "text-red-300",
  neutral: "text-muted-foreground",
};

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "bullish")
    return <IconArrowUpRight size={14} stroke={2} aria-hidden />;
  if (trend === "bearish")
    return <IconArrowDownRight size={14} stroke={2} aria-hidden />;
  return <IconMinus size={14} stroke={2} aria-hidden />;
}

export function TopStripMetrics({ metrics }: { metrics: MetricCard[] }) {
  return (
    <section
      aria-label="Market metrics"
      className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
    >
      <ul
        className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-5"
        role="list"
      >
        {metrics.map((m) => (
          <li
            key={m.key}
            className="min-w-[150px] rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {m.label}
              </p>
              {m.delta && (
                <span
                  className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${TREND_TONE[m.trend]}`}
                >
                  <TrendIcon trend={m.trend} />
                  {m.delta}
                </span>
              )}
            </div>
            <p className="mt-2 font-mono text-lg font-semibold text-foreground">
              {m.value}
            </p>
            {m.caption && (
              <p
                className={`mt-1 text-[11px] ${
                  m.delta ? "text-muted-foreground" : TREND_TONE[m.trend]
                }`}
              >
                {m.caption}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
