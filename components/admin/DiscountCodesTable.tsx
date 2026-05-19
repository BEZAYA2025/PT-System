"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconAlertCircle, IconLoader2, IconPlus } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type { DiscountCode } from "@/lib/admin";
import { ActionsMenu } from "./ActionsMenu";
import { CreateDiscountCodeModal } from "./CreateDiscountCodeModal";
import { EditDiscountCodeModal } from "./EditDiscountCodeModal";

interface Props {
  initialCodes: DiscountCode[] | null;
}

function formatDiscount(c: DiscountCode): string {
  const value = c.discount_value ?? 0;
  const unit = c.discount_type === "fixed" ? `$${value}` : `${value}%`;
  if (c.duration === "forever") return `${unit} off forever`;
  if (c.duration === "repeating") {
    const months = c.duration_in_months ?? 0;
    return `${unit} off ${months} month${months === 1 ? "" : "s"}`;
  }
  return `${unit} off once`;
}

function formatUses(c: DiscountCode): string {
  const cur = c.uses ?? c.redemptions ?? 0;
  const max = c.max_uses ?? c.max_redemptions ?? null;
  return max === null || max === undefined ? `${cur} / ∞` : `${cur} / ${max}`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isActive(c: DiscountCode): boolean {
  if (typeof c.active === "boolean") return c.active;
  return (c.status ?? "active").toLowerCase() !== "disabled";
}

export function DiscountCodesTable({ initialCodes }: Props) {
  const router = useRouter();
  const [codes, setCodes] = useState<DiscountCode[]>(initialCodes ?? []);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<DiscountCode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DiscountCode | null>(null);
  const [partialWarning, setPartialWarning] = useState<{
    codeId: string;
    warning: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const refreshCodes = async () => {
    try {
      const res = await fetch("/api/proxy/admin/discount-codes", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as DiscountCode[])
        : data && typeof data === "object"
          ? (((data as { codes?: unknown }).codes ??
              (data as { discount_codes?: unknown }).discount_codes) as
              | DiscountCode[]
              | undefined)
          : null;
      if (Array.isArray(list)) setCodes(list);
    } catch {
      // swallow — table keeps prior state
    }
  };

  const handleCreated = async () => {
    setCreateOpen(false);
    setToast({ message: "Code created", tone: "success" });
    await refreshCodes();
    router.refresh();
  };

  const handlePartial = (info: { codeId: string; warning: string }) => {
    setCreateOpen(false);
    setPartialWarning(info);
    refreshCodes();
    router.refresh();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setToast({ message: `Copied ${code}`, tone: "success" });
    } catch {
      // ignore
    }
  };

  const handleDeactivate = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/discount-codes/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCodes((prev) =>
        prev.map((c) =>
          c.id === confirmDelete.id
            ? { ...c, active: false, status: "disabled" }
            : c,
        ),
      );
      setToast({ message: "Code disabled", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Disable failed · ${err.message}`
            : "Disable failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  const handleEditSaved = async () => {
    setEditing(null);
    setToast({ message: "Code updated", tone: "success" });
    await refreshCodes();
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Discount Codes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage promo codes for members and affiliates.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover"
        >
          <IconPlus size={14} stroke={2} aria-hidden />
          Create Code
        </button>
      </div>

      {partialWarning && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">Partial create — manual cleanup needed</p>
          <p className="mt-1 text-xs">
            Stripe Coupon was created, but the Promotion Code phase failed.
            Delete code{" "}
            <code className="font-mono text-[11px]">
              {partialWarning.codeId}
            </code>{" "}
            manually in Stripe before retrying.
          </p>
          <p className="mt-1 text-xs opacity-80">
            Detail · {partialWarning.warning}
          </p>
          <button
            type="button"
            onClick={() => setPartialWarning(null)}
            className="mt-2 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {!initialCodes ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-6">
          <p className="flex items-center gap-2 text-sm text-amber-200">
            <IconAlertCircle size={16} stroke={1.75} aria-hidden />
            Couldn&apos;t reach the discount-codes service. Try refreshing.
          </p>
        </div>
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/40 px-6 py-16 text-center">
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            No codes yet
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Click <strong>Create Code</strong> to generate your first promo.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-surface/40 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Uses</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="w-[44px] px-2 py-3" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const active = isActive(c);
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 last:border-0 hover:bg-surface/60"
                    >
                      <td className="px-4 py-3">
                        <code className="font-mono text-sm font-semibold text-foreground">
                          {c.code}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {formatDiscount(c)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatUses(c)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                            active
                              ? "border-emerald/30 bg-emerald/[0.08] text-emerald"
                              : "border-border bg-surface text-muted-foreground",
                          ].join(" ")}
                        >
                          {active ? "active" : "disabled"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-muted-foreground"
                        suppressHydrationWarning
                      >
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-2 py-3">
                        <ActionsMenu
                          items={[
                            { label: "Edit", onSelect: () => setEditing(c) },
                            { label: "Copy code", onSelect: () => copyCode(c.code) },
                            ...(active
                              ? [
                                  {
                                    label: "Deactivate",
                                    onSelect: () => setConfirmDelete(c),
                                    tone: "danger" as const,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="grid gap-2 md:hidden">
            {codes.map((c) => {
              const active = isActive(c);
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-border bg-surface/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono text-sm font-semibold text-foreground">
                      {c.code}
                    </code>
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                        active
                          ? "border-emerald/30 bg-emerald/[0.08] text-emerald"
                          : "border-border bg-surface text-muted-foreground",
                      ].join(" ")}
                    >
                      {active ? "active" : "disabled"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground">
                    {formatDiscount(c)}
                  </p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{formatUses(c)}</span>
                    <span suppressHydrationWarning>
                      {formatDate(c.created_at)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <ActionsMenu
                      items={[
                        { label: "Edit", onSelect: () => setEditing(c) },
                        { label: "Copy code", onSelect: () => copyCode(c.code) },
                        ...(active
                          ? [
                              {
                                label: "Deactivate",
                                onSelect: () => setConfirmDelete(c),
                                tone: "danger" as const,
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <CreateDiscountCodeModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onPartialFailure={handlePartial}
      />

      <EditDiscountCodeModal
        code={editing}
        onClose={() => setEditing(null)}
        onSaved={handleEditSaved}
      />

      <Modal
        open={confirmDelete !== null}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Disable this code?"
        description={
          confirmDelete
            ? `Stops new redemptions of ${confirmDelete.code}. Existing redemptions remain valid.`
            : undefined
        }
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            The Stripe Coupon will be archived. The code can&apos;t be
            re-enabled — create a new one if you need it again.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-sm font-semibold text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
            >
              {busy && (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              )}
              Disable
            </button>
          </div>
        </div>
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
