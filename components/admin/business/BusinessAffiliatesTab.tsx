"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconCopy,
  IconLoader2,
  IconPlus,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import { formatDate, formatNumber, formatUSD } from "@/lib/admin-format";

interface AffiliateCode {
  code: string;
  description?: string | null;
  commission_pct?: number | null;
  referrals_count?: number | null;
  conversions?: number | null;
  total_earned_usd?: number | null;
  active?: boolean | null;
  created_at?: string | null;
}

interface ReferralEntry {
  id?: string | null;
  member_id?: string | null;
  member_email?: string | null;
  signed_up_at?: string | null;
  converted_at?: string | null;
  status?: string | null;
}

export function BusinessAffiliatesTab() {
  const [codes, setCodes] = useState<AffiliateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [drillCode, setDrillCode] = useState<AffiliateCode | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/business/affiliates", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as AffiliateCode[])
        : data && typeof data === "object"
          ? ((data as { affiliates?: AffiliateCode[] }).affiliates ?? [])
          : [];
      setCodes(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setToast({ message: `Copied ${code}`, tone: "success" });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Affiliates
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Codes for the post-beta affiliate program.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
        >
          <IconPlus size={13} stroke={2} aria-hidden />
          New code
        </button>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading affiliates…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : codes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No affiliate codes yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Code</th>
                <th className="px-3 py-2 font-medium">Commission</th>
                <th className="px-3 py-2 font-medium text-right">Referrals</th>
                <th className="px-3 py-2 font-medium text-right">Conv.</th>
                <th className="px-3 py-2 font-medium text-right">Earned</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="w-[120px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.code} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2">
                    <code className="font-mono text-sm font-semibold text-foreground">
                      {c.code}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {typeof c.commission_pct === "number"
                      ? `${c.commission_pct}%`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                    {formatNumber(c.referrals_count)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                    {formatNumber(c.conversions)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                    {formatUSD(c.total_earned_usd)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDate(c.created_at)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => copyCode(c.code)}
                      className="mr-1 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:border-emerald/40"
                    >
                      <IconCopy size={10} stroke={1.75} aria-hidden />
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrillCode(c)}
                      className="inline-flex h-7 items-center rounded-md border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:border-emerald/40"
                    >
                      Referrals
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && (
        <AffiliateCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            setToast({ message: "Affiliate code created", tone: "success" });
            await reload();
          }}
        />
      )}

      {drillCode && (
        <ReferralsModal
          code={drillCode}
          onClose={() => setDrillCode(null)}
        />
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function AffiliateCreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [commission, setCommission] = useState("20");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("Code is required.");
      return;
    }
    const pct = Number.parseFloat(commission);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("Commission must be between 0 and 100.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/business/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: normalized,
          description: description.trim() || null,
          commission_pct: pct,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      }
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={() => !busy && onClose()} title="New affiliate code" size="sm">
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Code
          </span>
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
            }
            placeholder="ALEX25"
            disabled={busy}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase text-foreground focus:border-emerald focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Description
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={busy}
            placeholder="Optional"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Commission (%)
          </span>
          <input
            type="number"
            min={0}
            max={100}
            step="0.5"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
        </label>
        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
          >
            {busy && (
              <IconLoader2
                size={14}
                stroke={2}
                className="animate-spin"
                aria-hidden
              />
            )}
            Create
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReferralsModal({
  code,
  onClose,
}: {
  code: AffiliateCode;
  onClose: () => void;
}) {
  const [referrals, setReferrals] = useState<ReferralEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(
      `/api/proxy/admin/business/affiliates/${encodeURIComponent(code.code)}/referrals`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as ReferralEntry[])
          : data && typeof data === "object"
            ? ((data as { referrals?: ReferralEntry[] }).referrals ?? [])
            : [];
        setReferrals(list);
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
  }, [code.code]);

  return (
    <Modal
      open
      onClose={onClose}
      title={`Referrals · ${code.code}`}
      description={`${code.referrals_count ?? 0} referrals · ${code.conversions ?? 0} conversions · ${formatUSD(code.total_earned_usd)}`}
      size="lg"
    >
      <div className="space-y-3">
        {loading ? (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading referrals…
          </p>
        ) : error ? (
          <p className="text-xs text-amber-200">{error}</p>
        ) : !referrals || referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">No referrals yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-2 font-medium">Member</th>
                <th className="px-2 py-2 font-medium">Signed up</th>
                <th className="px-2 py-2 font-medium">Converted</th>
                <th className="px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r, idx) => (
                <tr
                  key={r.id ?? idx}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="px-2 py-2 text-xs text-foreground">
                    {r.member_email ?? r.member_id ?? "—"}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDate(r.signed_up_at)}
                  </td>
                  <td className="px-2 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDate(r.converted_at)}
                  </td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {r.status ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
