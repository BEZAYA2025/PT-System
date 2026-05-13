"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  cardClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
  submitSuccessClasses,
} from "@/lib/ui";

const apiKeySchema = z.object({
  binance_api_key: z
    .string()
    .min(10, { error: "API key looks too short." })
    .max(200)
    .trim(),
  binance_api_secret: z
    .string()
    .min(10, { error: "API secret looks too short." })
    .max(200)
    .trim(),
});

type ApiKeyInput = z.infer<typeof apiKeySchema>;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ApiKeyManager({
  connected,
  addedAt,
}: {
  connected: boolean;
  addedAt: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "edit" | "confirm-remove">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyInput>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { binance_api_key: "", binance_api_secret: "" },
  });

  const onUpdate = async (values: ApiKeyInput) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/proxy/auth/update-binance-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Could not update API key.",
        );
        return;
      }
      setSuccess("API key updated.");
      setMode("idle");
      reset();
      router.refresh();
    } catch {
      setError("Connection issue. Please try again.");
    }
  };

  const onRemove = async () => {
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/proxy/auth/remove-binance-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Could not remove API key.",
        );
        return;
      }
      setSuccess("API key removed.");
      setMode("idle");
      router.refresh();
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className={cardClasses}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Binance API key
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Read-only, IP-restricted to{" "}
        <span className="font-mono text-foreground">145.79.11.110</span>.
      </p>

      <dl className="mt-6 text-sm">
        <dt className="text-xs uppercase tracking-wider text-muted-foreground">
          Status
        </dt>
        <dd className="mt-1 font-mono text-foreground">
          {connected ? `Connected (added ${formatDate(addedAt)})` : "Not connected"}
        </dd>
      </dl>

      {error && (
        <p role="alert" className={`${submitErrorClasses} mt-4`}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" className={`${submitSuccessClasses} mt-4`}>
          {success}
        </p>
      )}

      {mode === "idle" && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode("edit")}
            className={buttonSecondaryClasses}
          >
            {connected ? "Update API key" : "Add API key"}
          </button>
          {connected && (
            <button
              type="button"
              onClick={() => setMode("confirm-remove")}
              className="inline-flex h-12 items-center justify-center rounded-full border border-red-500/40 bg-red-500/[0.06] px-6 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10"
            >
              Remove API key
            </button>
          )}
        </div>
      )}

      {mode === "edit" && (
        <form
          onSubmit={handleSubmit(onUpdate)}
          noValidate
          className="mt-6 space-y-4"
        >
          <div>
            <label htmlFor="binance_api_key" className={labelClasses}>
              API key
            </label>
            <input
              id="binance_api_key"
              type="text"
              autoComplete="off"
              aria-invalid={errors.binance_api_key ? "true" : undefined}
              className={`${inputClasses} mt-2 font-mono text-sm`}
              {...register("binance_api_key")}
            />
            {errors.binance_api_key && (
              <p role="alert" className={errorClasses}>
                {errors.binance_api_key.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="binance_api_secret" className={labelClasses}>
              API secret
            </label>
            <input
              id="binance_api_secret"
              type="password"
              autoComplete="off"
              aria-invalid={errors.binance_api_secret ? "true" : undefined}
              className={`${inputClasses} mt-2 font-mono text-sm`}
              {...register("binance_api_secret")}
            />
            {errors.binance_api_secret && (
              <p role="alert" className={errorClasses}>
                {errors.binance_api_secret.message}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={buttonPrimaryClasses}
            >
              {isSubmitting ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                reset();
              }}
              className={buttonSecondaryClasses}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "confirm-remove" && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/[0.04] p-4">
          <p className="text-sm text-foreground">
            Remove the stored Binance API key? Trade-tracking will stop until
            you add a new one.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="inline-flex h-12 items-center justify-center rounded-full bg-red-500 px-6 text-sm font-medium text-red-50 transition-colors hover:bg-red-400 disabled:opacity-60"
            >
              {pending ? "Removing…" : "Yes, remove"}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className={buttonSecondaryClasses}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
