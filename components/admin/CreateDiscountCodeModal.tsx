"use client";

import { useState } from "react";
import { IconLoader2, IconTicket } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";

type DiscountType = "percent" | "fixed";
type DurationKind = "once" | "forever" | "repeating";

interface SubmitResult {
  ok: boolean;
  message: string;
  partial?: { codeId: string; warning: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onPartialFailure: (info: { codeId: string; warning: string }) => void;
}

export function CreateDiscountCodeModal({
  open,
  onClose,
  onCreated,
  onPartialFailure,
}: Props) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<DiscountType>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [duration, setDuration] = useState<DurationKind>("once");
  const [months, setMonths] = useState("3");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setCode("");
    setDiscountType("percent");
    setDiscountValue("");
    setDuration("once");
    setMonths("3");
    setMaxUses("");
    setExpiresAt("");
    setBusy(false);
    setError(null);
    setFieldErrors({});
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
    if (!normalized) errs.code = "Required";
    else if (!/^[A-Z0-9_-]+$/.test(normalized))
      errs.code = "Letters, numbers, _ and - only";
    const valueNum = Number.parseFloat(discountValue);
    if (!Number.isFinite(valueNum) || valueNum <= 0)
      errs.discountValue = "Must be positive";
    else if (discountType === "percent" && valueNum > 100)
      errs.discountValue = "Max 100%";
    if (duration === "repeating") {
      const m = Number.parseInt(months, 10);
      if (!Number.isFinite(m) || m < 1 || m > 12)
        errs.months = "1–12 months";
    }
    if (maxUses) {
      const m = Number.parseInt(maxUses, 10);
      if (!Number.isFinite(m) || m < 1) errs.maxUses = "Must be ≥ 1";
    }
    if (expiresAt) {
      const t = Date.parse(expiresAt);
      if (!Number.isFinite(t)) errs.expiresAt = "Invalid date";
      else if (t < Date.now()) errs.expiresAt = "Must be in the future";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (): Promise<SubmitResult> => {
    if (!validate()) return { ok: false, message: "Fix the errors above" };
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      code: code.trim().toUpperCase().replace(/\s+/g, ""),
      discount_type: discountType,
      discount_value: Number.parseFloat(discountValue),
      duration,
    };
    if (duration === "repeating") {
      payload.duration_in_months = Number.parseInt(months, 10);
    }
    if (maxUses) payload.max_uses = Number.parseInt(maxUses, 10);
    if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();

    try {
      const res = await fetch("/api/proxy/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          (data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : null) ?? `HTTP ${res.status}`;
        setError(message);
        return { ok: false, message };
      }

      // 2-phase partial-failure check per ADMIN_API_SPEC: backend
      // returns 2xx with `partial: true` + `code_id` + `warning`
      // when Stripe Coupon succeeded but Promotion-Code phase failed.
      const d = data as Record<string, unknown> | null;
      const partial = d && d.partial === true;
      const codeId = d && typeof d.code_id === "string" ? d.code_id : null;
      const warning =
        d && typeof d.warning === "string" ? d.warning : "Partial failure";
      if (partial && codeId) {
        onPartialFailure({ codeId, warning });
        return { ok: true, message: warning, partial: { codeId, warning } };
      }

      reset();
      onCreated();
      return { ok: true, message: "Code created" };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setError(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Create discount code"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        <Field
          label="Code"
          hint="Auto-uppercased. Letters, numbers, _ or -."
          error={fieldErrors.code}
        >
          <input
            type="text"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))
            }
            placeholder="BETA50"
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm uppercase tracking-wider text-foreground focus:border-emerald focus:outline-none"
          />
        </Field>

        <Field label="Discount type" error={fieldErrors.discountType}>
          <div className="flex gap-2">
            {(["percent", "fixed"] as const).map((t) => (
              <label
                key={t}
                className={[
                  "flex flex-1 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm",
                  discountType === t
                    ? "border-emerald/40 bg-emerald/[0.06] text-emerald"
                    : "border-border bg-background text-foreground",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="discount-type"
                  className="sr-only"
                  checked={discountType === t}
                  onChange={() => setDiscountType(t)}
                  disabled={busy}
                />
                {t === "percent" ? "Percentage" : "Fixed amount"}
              </label>
            ))}
          </div>
        </Field>

        <Field
          label={discountType === "percent" ? "Discount (%)" : "Discount ($)"}
          error={fieldErrors.discountValue}
        >
          <div className="relative">
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percent" ? "50" : "10"}
              min={0}
              max={discountType === "percent" ? 100 : undefined}
              step={discountType === "percent" ? 1 : "0.01"}
              disabled={busy}
              className="w-full rounded-md border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {discountType === "percent" ? "%" : "$"}
            </span>
          </div>
        </Field>

        <Field label="Duration" error={fieldErrors.duration}>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { v: "once", label: "Once" },
                { v: "forever", label: "Forever" },
                { v: "repeating", label: "N months" },
              ] as const
            ).map(({ v, label }) => (
              <label
                key={v}
                className={[
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm",
                  duration === v
                    ? "border-emerald/40 bg-emerald/[0.06] text-emerald"
                    : "border-border bg-background text-foreground",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="duration"
                  className="sr-only"
                  checked={duration === v}
                  onChange={() => setDuration(v)}
                  disabled={busy}
                />
                {label}
              </label>
            ))}
          </div>
        </Field>

        {duration === "repeating" && (
          <Field
            label="Months"
            hint="Between 1 and 12"
            error={fieldErrors.months}
          >
            <input
              type="number"
              min={1}
              max={12}
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              disabled={busy}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          </Field>
        )}

        <Field
          label="Max uses"
          hint="Leave empty for unlimited"
          error={fieldErrors.maxUses}
        >
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="100"
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
        </Field>

        <Field label="Expires at (optional)" error={fieldErrors.expiresAt}>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            disabled={busy}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
        </Field>

        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={close}
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
            {busy ? (
              <IconLoader2
                size={14}
                stroke={2}
                className="animate-spin"
                aria-hidden
              />
            ) : (
              <IconTicket size={14} stroke={2} aria-hidden />
            )}
            Create code
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
