"use client";

import { useEffect, useState } from "react";
import { IconLoader2 } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import type { DiscountCode } from "@/lib/admin";

interface Props {
  code: DiscountCode | null;
  onClose: () => void;
  onSaved: () => void;
}

function dateToInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

function isCodeActive(c: DiscountCode): boolean {
  if (typeof c.active === "boolean") return c.active;
  return (c.status ?? "active").toLowerCase() !== "disabled";
}

export function EditDiscountCodeModal({ code, onClose, onSaved }: Props) {
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [active, setActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const m = code.max_uses ?? code.max_redemptions ?? null;
    setMaxUses(m !== null && m !== undefined ? String(m) : "");
    setExpiresAt(dateToInputValue(code.expires_at));
    setActive(isCodeActive(code));
    setError(null);
  }, [code]);

  if (!code) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const payload: Record<string, unknown> = {};
    if (maxUses) {
      const m = Number.parseInt(maxUses, 10);
      if (Number.isFinite(m) && m >= 1) payload.max_uses = m;
    } else {
      payload.max_uses = null;
    }
    if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();
    else payload.expires_at = null;
    payload.active = active;

    try {
      const res = await fetch(
        `/api/proxy/admin/discount-codes/${encodeURIComponent(code.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const message =
          (data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : null) ?? `HTTP ${res.status}`;
        throw new Error(message);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title={`Edit code · ${code.code}`}
      description="Value and code itself are locked by Stripe — only the limits below can change."
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Max uses
          </label>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited"
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for unlimited.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Expires at
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
        </div>

        <label className="flex cursor-pointer items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
          <span>Active</span>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            disabled={busy}
            className="size-4"
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
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
