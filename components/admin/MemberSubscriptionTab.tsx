"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconArrowUpRight,
  IconCopy,
  IconCreditCard,
  IconLoader2,
  IconReceipt,
  IconReceiptRefund,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type { MemberDetail, MemberInvoice } from "@/lib/admin";

interface Props {
  member: MemberDetail;
}

function formatUSD(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
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

function trialDaysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const ms = t - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function stripeCustomerUrl(cusId: string): string {
  // Live by default; the URL shape is identical for /test/ when
  // viewing test-mode data — the founder will see the right env once
  // the dashboard logs them in.
  return `https://dashboard.stripe.com/customers/${encodeURIComponent(cusId)}`;
}

function stripeSubscriptionUrl(subId: string): string {
  return `https://dashboard.stripe.com/subscriptions/${encodeURIComponent(subId)}`;
}

// Pill colour for the tier badge — VIP gets the same emerald
// treatment as the list view + detail header, Standard stays neutral.
function tierBadgeClass(tier: string | null | undefined): string {
  return (tier ?? "").toLowerCase() === "vip"
    ? "border-emerald/30 bg-emerald/[0.08] text-emerald"
    : "border-border bg-surface text-muted-foreground";
}

// §27 O4 chain: effective_status > display > is_trial→"trialing"
// > raw. The raw subscription_status reads "active" even for trial
// members (the DB stores trial_started_at separately), so reading
// it directly here surfaced bezaya as "active" instead of "trialing".
function effectiveStatusOf(member: MemberDetail): string {
  return (
    member.effective_status ??
    member.subscription_status_display ??
    (member.is_trial ? "trialing" : null) ??
    member.subscription_status ??
    member.status ??
    "—"
  );
}

// Status pill colour — mirrors the list-view statusBadgeClass so the
// detail view reads in the same colour language wherever the member
// appears.
function statusPillClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active" || s === "past_due")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (s === "trial" || s === "trialing")
    return "border-sky-400/30 bg-sky-400/[0.08] text-sky-300";
  if (s === "suspended" || s === "canceled" || s === "cancelled")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  return "border-border bg-surface text-muted-foreground";
}

function invoiceStatusClass(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  if (s === "paid")
    return "border-emerald/30 bg-emerald/[0.08] text-emerald";
  if (s === "pending" || s === "open" || s === "draft")
    return "border-amber-500/30 bg-amber-500/[0.08] text-amber-200";
  if (s === "failed" || s === "uncollectible" || s === "void")
    return "border-red-400/40 bg-red-500/[0.08] text-red-300";
  return "border-border bg-surface text-muted-foreground";
}

export function MemberSubscriptionTab({ member }: Props) {
  const [invoices, setInvoices] = useState<MemberInvoice[] | null>(null);
  const [invoicesError, setInvoicesError] = useState<string | null>(null);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  // Backend §25 (post-audit) — trial-only members have no Stripe
  // customer yet, so the endpoint now ships {stripe_customer_missing:
  // true} instead of erroring. Render that as a calm empty-state
  // rather than the amber "couldn't load" banner.
  const [noStripeCustomer, setNoStripeCustomer] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelImmediate, setCancelImmediate] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInvoicesLoading(true);
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/invoices`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setInvoices(data as MemberInvoice[]);
          setNoStripeCustomer(false);
          return;
        }
        if (data && typeof data === "object") {
          const obj = data as {
            invoices?: MemberInvoice[];
            stripe_customer_missing?: boolean;
          };
          setNoStripeCustomer(Boolean(obj.stripe_customer_missing));
          setInvoices(obj.invoices ?? []);
          return;
        }
        setInvoices([]);
        setNoStripeCustomer(false);
      })
      .catch((err: Error) => {
        if (!cancelled) setInvoicesError(err.message);
      })
      .finally(() => {
        if (!cancelled) setInvoicesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id]);

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      window.setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // ignore
    }
  };

  const handleRefund = async () => {
    if (refundBusy) return;
    setRefundBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/refund-last`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            refundReason.trim() ? { reason: refundReason.trim() } : {},
          ),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        amount_usd?: number;
        message?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      }
      const amt = data?.amount_usd;
      setToast({
        message:
          typeof amt === "number"
            ? `Refunded ${formatUSD(amt)}`
            : "Refund issued",
        tone: "success",
      });
      setRefundOpen(false);
      setRefundReason("");
      // Re-pull invoices so the refund flips status visibly.
      const r = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/invoices`,
        { cache: "no-store" },
      );
      if (r.ok) {
        const d = await r.json().catch(() => null);
        const list = Array.isArray(d)
          ? (d as MemberInvoice[])
          : d && typeof d === "object"
            ? ((d as { invoices?: MemberInvoice[] }).invoices ?? [])
            : [];
        setInvoices(list);
      }
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Refund failed · ${err.message}` : "Refund failed",
        tone: "error",
      });
    } finally {
      setRefundBusy(false);
    }
  };

  const trialLeft = trialDaysLeft(member.trial_end ?? member.trial_ends_at);
  const periodEnd =
    member.subscription_period_end ?? member.current_period_end;

  const cusId = member.stripe_customer_id ?? null;
  const subId = member.stripe_subscription_id ?? null;

  return (
    <div className="space-y-6">
      {/* Plan card */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Plan
          </h2>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tierBadgeClass(member.tier)}`}
            >
              {(member.tier ?? "standard").toUpperCase()}
            </span>
            {member.billing_interval && (
              <span className="inline-flex items-center rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {member.billing_interval}
              </span>
            )}
          </div>
        </header>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Status as a coloured pill matching the list view —
              uses the §27 O4 effective_status chain so trialing
              members read as "trialing", not the raw "active"
              that the DB column carries for trials. */}
          {(() => {
            const status = effectiveStatusOf(member);
            return (
              <Row
                label="Status"
                value={
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${statusPillClass(status)}`}
                  >
                    {status}
                  </span>
                }
              />
            );
          })()}
          <Row
            label={
              trialLeft !== null && trialLeft >= 0
                ? "Trial ends"
                : "Period ends"
            }
            value={
              trialLeft !== null && trialLeft >= 0
                ? `${trialLeft} day${trialLeft === 1 ? "" : "s"} · ${formatDate(member.trial_end ?? member.trial_ends_at)}`
                : formatDate(periodEnd)
            }
          />
        </dl>
      </section>

      {/* Stripe sync */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Stripe sync
          </h2>
          {cusId && (
            <a
              href={stripeCustomerUrl(cusId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald hover:text-emerald-hover"
            >
              Open customer in Stripe
              <IconArrowUpRight size={11} stroke={2} aria-hidden />
            </a>
          )}
        </header>
        <dl className="mt-4 grid grid-cols-1 gap-3">
          <CopyRow
            label="Customer ID"
            value={cusId}
            onCopy={(v) => copy("customer", v)}
            copied={copiedField === "customer"}
          />
          <CopyRow
            label="Subscription ID"
            value={subId}
            href={subId ? stripeSubscriptionUrl(subId) : null}
            onCopy={(v) => copy("subscription", v)}
            copied={copiedField === "subscription"}
          />
        </dl>
      </section>

      {/* Payment method */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Payment method
          </h2>
        </header>
        {member.payment_method ? (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3">
            <span
              aria-hidden
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-emerald/[0.08] text-emerald"
            >
              <IconCreditCard size={16} stroke={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {(member.payment_method.brand ?? "Card").toUpperCase()} ·
                ····{" "}
                {member.payment_method.last_4 ??
                  member.payment_method.last4 ??
                  "????"}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {member.payment_method.exp_month &&
                member.payment_method.exp_year
                  ? `Expires ${String(member.payment_method.exp_month).padStart(2, "0")}/${String(member.payment_method.exp_year).slice(-2)}`
                  : "Expiry unavailable"}
                {member.payment_method.updated_at && (
                  <> · updated {formatDate(member.payment_method.updated_at)}</>
                )}
              </p>
            </div>
            {cusId && (
              <a
                href={stripeCustomerUrl(cusId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:border-emerald/40"
              >
                View in Stripe
                <IconArrowUpRight size={11} stroke={2} aria-hidden />
              </a>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
            <span
              aria-hidden
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface"
            >
              <IconCreditCard size={16} stroke={1.75} />
            </span>
            No card on file.
          </div>
        )}
      </section>

      {/* Invoice history */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Invoice history
          </h2>
          {cusId && (
            <a
              href={`${stripeCustomerUrl(cusId)}#invoices`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald hover:text-emerald-hover"
            >
              View all in Stripe
              <IconArrowUpRight size={11} stroke={2} aria-hidden />
            </a>
          )}
        </header>
        {invoicesLoading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading invoices…
          </p>
        ) : invoicesError ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load invoices · {invoicesError}
          </p>
        ) : noStripeCustomer ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No billing history yet — Stripe customer is created on first
            charge.
          </p>
        ) : !invoices || invoices.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No invoices on file.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60 rounded-lg border border-border/60 bg-background">
            {invoices.slice(0, 10).map((inv) => {
              const url = inv.hosted_url ?? inv.hosted_invoice_url ?? null;
              const pdf = inv.pdf_url ?? inv.invoice_pdf ?? null;
              return (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="inline-flex size-7 items-center justify-center rounded-full bg-surface text-muted-foreground"
                    >
                      <IconReceipt size={13} stroke={1.75} />
                    </span>
                    <span className="font-mono text-xs text-foreground">
                      {formatDate(inv.date ?? inv.created)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-foreground">
                      {formatUSD(inv.amount_usd ?? inv.amount)}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${invoiceStatusClass(inv.status)}`}
                    >
                      {inv.status ?? "—"}
                    </span>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-emerald hover:text-emerald-hover"
                      >
                        Open
                      </a>
                    )}
                    {pdf && (
                      <a
                        href={pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Actions */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Actions
          </h2>
        </header>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setRefundOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-3 text-xs font-semibold text-amber-200 hover:bg-amber-500/[0.14]"
          >
            <IconReceiptRefund size={13} stroke={1.75} />
            Refund last invoice
          </button>
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-xs font-semibold text-red-200 hover:bg-red-500/[0.14]"
          >
            Cancel subscription
          </button>
        </div>
      </section>

      <Modal
        open={refundOpen}
        onClose={() => !refundBusy && setRefundOpen(false)}
        title="Refund last invoice?"
        description="Stripe issues the refund immediately; the member sees it on their card within a few business days."
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason (optional)
            </span>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={3}
              placeholder="e.g. duplicate charge, requested cancellation, etc."
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRefundOpen(false)}
              disabled={refundBusy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRefund}
              disabled={refundBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-3 text-sm font-semibold text-amber-200 hover:bg-amber-500/[0.14] disabled:opacity-60"
            >
              {refundBusy && (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              )}
              Refund
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={cancelOpen}
        onClose={() => !cancelBusy && setCancelOpen(false)}
        title="Cancel subscription?"
        description="Defaults to cancel-at-period-end so the member keeps access through the current billing cycle."
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason (optional)
            </span>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. member requested refund, fraud, etc."
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-background px-3 py-2">
            <input
              type="checkbox"
              checked={cancelImmediate}
              onChange={(e) => setCancelImmediate(e.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              <span className="block text-sm text-foreground">
                Cancel immediately
              </span>
              <span className="block text-xs text-muted-foreground">
                Revokes access right away and may trigger a prorated
                refund. Default is cancel-at-period-end.
              </span>
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              disabled={cancelBusy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                if (cancelBusy) return;
                setCancelBusy(true);
                try {
                  const res = await fetch(
                    `/api/proxy/admin/members/${encodeURIComponent(member.id)}/cancel-subscription`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...(cancelReason.trim()
                          ? { reason: cancelReason.trim() }
                          : {}),
                        immediate: cancelImmediate,
                      }),
                    },
                  );
                  const data = (await res.json().catch(() => null)) as {
                    effective_date?: string;
                    refund_amount_usd?: number | null;
                    message?: string;
                    error?: string;
                  } | null;
                  if (!res.ok) {
                    throw new Error(
                      data?.message ?? data?.error ?? `HTTP ${res.status}`,
                    );
                  }
                  const eff = data?.effective_date
                    ? ` (effective ${formatDate(data.effective_date)})`
                    : "";
                  const refund =
                    typeof data?.refund_amount_usd === "number" &&
                    data.refund_amount_usd > 0
                      ? ` · ${formatUSD(data.refund_amount_usd)} refunded`
                      : "";
                  setToast({
                    message: `Subscription cancelled${eff}${refund}`,
                    tone: "success",
                  });
                  setCancelOpen(false);
                  setCancelReason("");
                  setCancelImmediate(false);
                } catch (err) {
                  setToast({
                    message:
                      err instanceof Error
                        ? `Cancel failed · ${err.message}`
                        : "Cancel failed",
                    tone: "error",
                  });
                } finally {
                  setCancelBusy(false);
                }
              }}
              disabled={cancelBusy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-sm font-semibold text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
            >
              {cancelBusy && (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              )}
              Cancel subscription
            </button>
          </div>
        </div>
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

function CopyRow({
  label,
  value,
  href,
  onCopy,
  copied,
}: {
  label: string;
  value: string | null;
  href?: string | null;
  onCopy: (v: string) => void;
  copied: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      {value ? (
        <dd className="inline-flex items-center gap-2">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-foreground hover:text-emerald"
            >
              {value}
            </a>
          ) : (
            <code className="font-mono text-xs text-foreground">{value}</code>
          )}
          <button
            type="button"
            onClick={() => onCopy(value)}
            className="inline-flex items-center gap-0.5 text-[11px] text-emerald hover:text-emerald-hover"
          >
            <IconCopy size={11} stroke={1.75} aria-hidden />
            {copied ? "Copied" : "Copy"}
          </button>
        </dd>
      ) : (
        <dd className="text-xs text-muted-foreground">—</dd>
      )}
    </div>
  );
}
