import type { Metadata } from "next";
import { requireUser, getDashboardSnapshot } from "@/lib/dal";
import { TierBadge } from "@/components/dashboard/TierBadge";
import { QuotaIndicator } from "@/components/dashboard/QuotaIndicator";
import { TradesTable } from "@/components/dashboard/TradesTable";
import { cardClasses } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Dashboard · PT System",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const snapshot = await getDashboardSnapshot();

  return (
    <main id="main" className="px-6 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {user.email}
            </h1>
          </div>
          <TierBadge tier={user.tier} />
        </header>

        <section className={cardClasses}>
          <QuotaIndicator
            used={user.aven_quota_used}
            limit={user.aven_quota_limit}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Paul&apos;s latest trades
            </h2>
            <p className="text-xs text-muted-foreground">last 5 closed</p>
          </div>
          <TradesTable
            trades={snapshot?.public_trades?.slice(0, 5) ?? []}
            emptyMessage="No recent trades yet — Paul will surface here when the next idea fires."
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Your open trades
            </h2>
            <p className="text-xs text-muted-foreground">
              from your Binance account
            </p>
          </div>
          <TradesTable
            trades={snapshot?.open_trades ?? []}
            emptyMessage={
              user.binance_api_key_connected
                ? "No open trades right now."
                : "No open trades — connect your Binance API key in Settings."
            }
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Last Aven briefing
          </h2>
          {snapshot?.latest_briefing ? (
            <article className={cardClasses}>
              <p className="text-xs text-muted-foreground">
                {new Date(
                  snapshot.latest_briefing.created_at,
                ).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                {snapshot.latest_briefing.body}
              </p>
              {user.tier === "vip" && snapshot.latest_briefing.voice_url && (
                <audio
                  controls
                  src={snapshot.latest_briefing.voice_url}
                  className="mt-4 w-full"
                />
              )}
            </article>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-surface/20 px-4 py-6 text-sm text-muted-foreground">
              No briefing yet today — Aven posts shortly after market open.
            </p>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Recent alerts
          </h2>
          {snapshot?.recent_alerts && snapshot.recent_alerts.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {snapshot.recent_alerts.slice(0, 5).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <p className="text-sm text-foreground">{a.message}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {a.kind.replace("_", " ")} ·{" "}
                    {new Date(a.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-surface/20 px-4 py-6 text-sm text-muted-foreground">
              No alerts in the last 24 hours.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
