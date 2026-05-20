"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAlertCircle,
  IconArchive,
  IconLoader2,
} from "@tabler/icons-react";
import { Toast, type ToastState } from "@/components/Toast";
import {
  formatDateTime,
  formatNumber,
  formatPct,
  formatUSD,
} from "@/lib/admin-format";

type TabKey = "setups" | "quality" | "paul" | "aggregated";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "setups", label: "Setups" },
  { key: "quality", label: "Quality" },
  { key: "paul", label: "Paul's Trades" },
  { key: "aggregated", label: "Member Aggregated" },
];

function isTabKey(v: string | null): v is TabKey {
  return v === "setups" || v === "quality" || v === "paul" || v === "aggregated";
}

export function TradingSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "setups";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "setups") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/trading${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Trading
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Setup scanner, quality reviewer (VKB), Paul&apos;s trade journal,
          and anonymized member aggregates.
        </p>
      </header>

      <nav
        aria-label="Trading tabs"
        className="-mx-4 overflow-x-auto border-b border-border bg-[#0a0a0a]/95 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
      >
        <ul className="flex min-w-max gap-1">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex h-11 items-center px-3 text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-emerald"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section>
        {activeTab === "setups" && <SetupsTab />}
        {activeTab === "quality" && <QualityTab />}
        {activeTab === "paul" && <PaulTradesTab />}
        {activeTab === "aggregated" && <AggregatedTab />}
      </section>
    </div>
  );
}

// ----- Setups (live setup scanner) ---------------------------------

interface Setup {
  id: string;
  symbol?: string | null;
  score?: number | null;
  confidence?: number | null;
  side?: "long" | "short" | string | null;
  confluence_zones?: string[] | null;
  detected_at?: string | null;
}

function SetupsTab() {
  const [setups, setSetups] = useState<Setup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/trading/setups", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as Setup[])
          : data && typeof data === "object"
            ? ((data as { setups?: Setup[] }).setups ?? [])
            : [];
        setSetups(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
        Loading setups…
      </p>
    );
  }
  if (error) {
    return (
      <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
        <IconAlertCircle size={12} stroke={1.75} aria-hidden />
        {error}
      </p>
    );
  }
  if (setups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
        Scanner reports no setups right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {setups.map((s) => (
        <article
          key={s.id}
          className="rounded-xl border border-border bg-surface/40 p-4"
        >
          <header className="flex items-center justify-between">
            <p className="font-mono text-sm font-semibold text-foreground">
              {s.symbol ?? "—"}
            </p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {s.side ?? "—"}
            </span>
          </header>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold text-emerald">
              {s.score ?? "—"}
            </span>
            {typeof s.confidence === "number" && (
              <span className="font-mono text-xs text-muted-foreground">
                {formatPct(s.confidence)} conf.
              </span>
            )}
          </div>
          {s.confluence_zones && s.confluence_zones.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.confluence_zones.map((z) => (
                <span
                  key={z}
                  className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                >
                  {z}
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            {formatDateTime(s.detected_at)}
          </p>
        </article>
      ))}
    </div>
  );
}

// ----- Quality reviewer (trading VKB) ------------------------------

interface SetupVkbEntry {
  id: string;
  symbol?: string | null;
  side?: "long" | "short" | string | null;
  score?: number | null;
  tags?: string[] | string | null;
  notes?: string | null;
  archived?: boolean | null;
  created_at?: string | null;
}

function normTags(t: SetupVkbEntry["tags"]): string[] {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  return t.split(",").map((s) => s.trim()).filter(Boolean);
}

function QualityTab() {
  const [items, setItems] = useState<SetupVkbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/trading/vkb", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as SetupVkbEntry[])
        : data && typeof data === "object"
          ? ((data as { entries?: SetupVkbEntry[]; setups?: SetupVkbEntry[] })
              .entries ??
              (data as { setups?: SetupVkbEntry[] }).setups ??
              [])
          : [];
      setItems(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const archive = async (entry: SetupVkbEntry) => {
    setArchivingId(entry.id);
    try {
      const res = await fetch(
        `/api/proxy/admin/trading/vkb/${encodeURIComponent(entry.id)}/archive`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) =>
        prev.map((p) => (p.id === entry.id ? { ...p, archived: true } : p)),
      );
      setToast({ message: "Entry archived", tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Archive failed · ${err.message}`
            : "Archive failed",
        tone: "error",
      });
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Setup quality reviewer
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Past setups Aven scored — archive removes them from future
          comparisons.
        </p>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No setup VKB entries yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 font-medium text-right">Score</th>
                <th className="px-3 py-2 font-medium">Tags</th>
                <th className="px-3 py-2 font-medium">Notes</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="w-[80px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const tags = normTags(e.tags);
                return (
                  <tr
                    key={e.id}
                    className={[
                      "border-b border-border/40 last:border-0",
                      e.archived ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {e.symbol ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
                      {e.side ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                      {e.score ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {e.notes ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(e.created_at)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {!e.archived && (
                        <button
                          type="button"
                          onClick={() => archive(e)}
                          disabled={archivingId === e.id}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:border-amber-500/40 disabled:opacity-60"
                        >
                          {archivingId === e.id ? (
                            <IconLoader2
                              size={10}
                              stroke={2}
                              className="animate-spin"
                              aria-hidden
                            />
                          ) : (
                            <IconArchive size={10} stroke={1.75} aria-hidden />
                          )}
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ----- Paul's trades (admin view, reusing existing cockpit endpoint)

interface PaulTrade {
  id: string;
  symbol?: string | null;
  side?: "long" | "short" | string | null;
  entry?: number | null;
  exit?: number | null;
  roi_pct?: number | null;
  pnl_usd?: number | null;
  status?: "open" | "closed" | string | null;
  opened_at?: string | null;
  closed_at?: string | null;
}

function PaulTradesTab() {
  const [trades, setTrades] = useState<PaulTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/cockpit/paul-trades?limit=100", {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        let list: PaulTrade[] = [];
        if (Array.isArray(data)) list = data as PaulTrade[];
        else if (data && typeof data === "object") {
          const d = data as { trades?: PaulTrade[]; items?: PaulTrade[] };
          list = d.trades ?? d.items ?? [];
        }
        setTrades(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalPnl = trades.reduce((acc, t) => acc + (t.pnl_usd ?? 0), 0);
  const closed = trades.filter((t) => (t.status ?? "").toLowerCase() === "closed");
  const wins = closed.filter((t) => (t.pnl_usd ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total trades" value={formatNumber(trades.length)} />
        <StatCard label="Win rate" value={formatPct(winRate)} />
        <StatCard
          label="Total PnL"
          value={formatUSD(totalPnl)}
          tone={totalPnl >= 0 ? "emerald" : "red"}
        />
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading trades…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : trades.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No trades in the journal yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Symbol</th>
                <th className="px-3 py-2 font-medium">Side</th>
                <th className="px-3 py-2 font-medium text-right">Entry</th>
                <th className="px-3 py-2 font-medium text-right">Exit</th>
                <th className="px-3 py-2 font-medium text-right">ROI</th>
                <th className="px-3 py-2 font-medium text-right">PnL</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => {
                const pnl = t.pnl_usd ?? 0;
                const tone = pnl >= 0 ? "text-emerald" : "text-red-300";
                return (
                  <tr key={t.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-foreground">
                      {t.symbol ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
                      {t.side ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                      {t.entry ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                      {t.exit ?? "—"}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${tone}`}>
                      {formatPct(t.roi_pct)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${tone}`}>
                      {formatUSD(t.pnl_usd)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
                      {t.status ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(t.closed_at ?? t.opened_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ----- Member aggregated (anonymized) ------------------------------

interface AggregateStats {
  total_members?: number | null;
  total_trades?: number | null;
  win_rate?: number | null;
  avg_pnl_usd?: number | null;
  median_pnl_usd?: number | null;
  by_tier?: Array<{ tier?: string; members?: number; win_rate?: number }>;
}

function AggregatedTab() {
  const [data, setData] = useState<AggregateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/trading/aggregate-stats", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setError("not_deployed");
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: unknown) => {
        if (cancelled || d === null) return;
        setData((d ?? {}) as AggregateStats);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
        Loading aggregates…
      </p>
    );
  }
  if (error === "not_deployed") {
    return (
      <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
        Aggregate-stats endpoint not yet deployed. Auto-fills the
        moment it lands.
      </p>
    );
  }
  if (error) {
    return (
      <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
        <IconAlertCircle size={12} stroke={1.75} aria-hidden />
        {error}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Anonymized stats across the member base — no PII.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Members" value={formatNumber(data?.total_members)} />
        <StatCard label="Trades" value={formatNumber(data?.total_trades)} />
        <StatCard label="Win rate" value={formatPct(data?.win_rate)} />
        <StatCard label="Avg PnL" value={formatUSD(data?.avg_pnl_usd)} />
      </div>
      {data?.by_tier && data.by_tier.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface/40 p-5">
          <header>
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              By tier
            </h2>
          </header>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Tier</th>
                <th className="px-2 py-2 font-medium text-right">Members</th>
                <th className="px-2 py-2 font-medium text-right">Win rate</th>
              </tr>
            </thead>
            <tbody>
              {data.by_tier.map((r, idx) => (
                <tr key={idx} className="border-b border-border/40 last:border-0">
                  <td className="px-2 py-2 text-foreground">
                    {(r.tier ?? "—").toUpperCase()}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-foreground">
                    {formatNumber(r.members)}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-foreground">
                    {formatPct(r.win_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "emerald" | "red";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald"
      : tone === "red"
        ? "text-red-300"
        : "text-foreground";
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-2xl font-semibold tracking-tight ${toneClass}`}
      >
        {value}
      </p>
    </article>
  );
}
