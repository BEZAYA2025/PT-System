"use client";

import { useEffect, useState } from "react";
import { IconCopy, IconLoader2, IconX } from "@tabler/icons-react";

interface MemberDetail {
  id: string;
  email: string;
  display_name?: string | null;
  tier?: "standard" | "vip" | null;
  status?: string | null;
  telegram_connected?: boolean;
  binance_api_key_connected?: boolean;
  has_exchange_connection?: boolean;
  exchange_type?: string | null;
  signed_up_at?: string | null;
  created_at?: string | null;
  last_login_at?: string | null;
  stripe_customer_id?: string | null;
  billing_interval?: "monthly" | "yearly" | null;
  trial_ends_at?: string | null;
  trial_end?: string | null;
  current_period_end?: string | null;
  subscription_period_end?: string | null;
  lifetime_value?: number | null;
  total_trades?: number | null;
  win_rate?: number | null;
  total_pnl?: number | null;
  aven_messages?: number | null;
  last_active_at?: string | null;
}

interface Props {
  memberId: string | null;
  onClose: () => void;
  onChangeTier: (id: string, tier: "standard" | "vip") => void;
  onSuspend: (id: string) => void;
  onReactivate: (id: string) => void;
  busy?: boolean;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function MemberDetailDrawer({
  memberId,
  onClose,
  onChangeTier,
  onSuspend,
  onReactivate,
  busy,
}: Props) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const open = memberId !== null;

  useEffect(() => {
    if (!memberId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/proxy/admin/members/${encodeURIComponent(memberId)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const m =
          (data as { member?: MemberDetail }).member ??
          (data as MemberDetail);
        setDetail(m ?? null);
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
  }, [memberId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const copyCustomerId = async () => {
    if (!detail?.stripe_customer_id) return;
    try {
      await navigator.clipboard.writeText(detail.stripe_customer_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — ignore
    }
  };

  if (!open) return null;

  const periodEnd =
    detail?.subscription_period_end ??
    detail?.current_period_end ??
    null;
  const trialEnd = detail?.trial_ends_at ?? detail?.trial_end ?? null;
  const isSuspended = (detail?.status ?? "").toLowerCase() === "suspended";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-drawer-title"
      className="fixed inset-0 z-50"
    >
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-surface-elevated shadow-2xl sm:max-w-lg">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2
              id="member-drawer-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {detail?.display_name ?? "Member details"}
            </h2>
            {detail?.email && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {detail.email}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <IconLoader2
                size={12}
                stroke={2}
                className="animate-spin"
                aria-hidden
              />
              Loading…
            </p>
          )}

          {error && !loading && (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
              Couldn&apos;t load member details · {error}
            </p>
          )}

          {detail && !loading && (
            <div className="space-y-6">
              <Section title="Profile">
                <Row label="Display Name" value={detail.display_name ?? "—"} />
                <Row label="Signed up" value={formatDate(detail.signed_up_at ?? detail.created_at)} />
                <Row label="Last login" value={formatDate(detail.last_login_at)} />
                <Row label="Telegram" value={detail.telegram_connected ? "Connected" : "Not connected"} />
                <Row
                  label="Exchange"
                  value={
                    detail.has_exchange_connection || detail.binance_api_key_connected
                      ? detail.exchange_type ?? "Connected"
                      : "Not connected"
                  }
                />
              </Section>

              <Section title="Subscription">
                <Row
                  label="Stripe customer"
                  value={
                    detail.stripe_customer_id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <code className="font-mono text-[11px]">
                          {detail.stripe_customer_id}
                        </code>
                        <button
                          type="button"
                          onClick={copyCustomerId}
                          className="inline-flex items-center gap-0.5 text-[11px] text-emerald hover:text-emerald-hover"
                        >
                          <IconCopy size={11} stroke={1.75} aria-hidden />
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row label="Tier" value={(detail.tier ?? "standard").toUpperCase()} />
                <Row
                  label="Billing"
                  value={detail.billing_interval ?? "—"}
                />
                <Row label="Trial ends" value={formatDate(trialEnd)} />
                <Row label="Period ends" value={formatDate(periodEnd)} />
                <Row
                  label="Lifetime value"
                  value={formatUSD(detail.lifetime_value)}
                />
              </Section>

              <Section title="Activity">
                <Row
                  label="Total trades"
                  value={detail.total_trades?.toLocaleString() ?? "—"}
                />
                <Row
                  label="Win rate"
                  value={
                    typeof detail.win_rate === "number"
                      ? `${(detail.win_rate * (detail.win_rate <= 1 ? 100 : 1)).toFixed(1)}%`
                      : "—"
                  }
                />
                <Row label="Total PnL" value={formatUSD(detail.total_pnl)} />
                <Row
                  label="Aven messages"
                  value={detail.aven_messages?.toLocaleString() ?? "—"}
                />
                <Row
                  label="Last active"
                  value={formatDate(detail.last_active_at)}
                />
              </Section>
            </div>
          )}
        </div>

        {detail && !loading && (
          <footer className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              onClick={() =>
                onChangeTier(
                  detail.id,
                  detail.tier === "vip" ? "standard" : "vip",
                )
              }
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-emerald/40 bg-emerald/[0.08] px-3 text-xs font-semibold text-emerald hover:bg-emerald/[0.14] disabled:opacity-60"
            >
              {detail.tier === "vip" ? "Downgrade to Standard" : "Upgrade to VIP"}
            </button>
            {isSuspended ? (
              <button
                type="button"
                onClick={() => onReactivate(detail.id)}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40 disabled:opacity-60"
              >
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSuspend(detail.id)}
                disabled={busy}
                className="inline-flex h-9 items-center rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-xs font-medium text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
              >
                Suspend
              </button>
            )}
          </footer>
        )}
      </aside>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
        {title}
      </h3>
      <dl className="mt-2 divide-y divide-border/60 rounded-lg border border-border bg-surface/40">
        {children}
      </dl>
    </section>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-foreground">{value}</dd>
    </div>
  );
}
