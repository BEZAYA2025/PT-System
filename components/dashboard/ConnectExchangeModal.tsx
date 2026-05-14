"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Modal } from "@/components/Modal";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";

// All exchanges (Binance / Bybit / OKX) ship today with the same
// exchange_type default of "binance" — no UI dropdown yet. When we add
// Bybit/OKX selection this becomes a real form field.
const DEFAULT_EXCHANGE_TYPE = "binance";

const apiKeySchema = z.object({
  exchange_api_key: z
    .string()
    .min(10, { error: "That looks too short — double-check the key." })
    .max(200)
    .trim(),
  exchange_api_secret: z
    .string()
    .min(10, { error: "That looks too short — double-check the secret." })
    .max(200)
    .trim(),
});

type ApiKeyInput = z.infer<typeof apiKeySchema>;

export function ConnectExchangeModal({
  open,
  onClose,
  isUpdate = false,
}: {
  open: boolean;
  onClose: () => void;
  isUpdate?: boolean;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyInput>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: { exchange_api_key: "", exchange_api_secret: "" },
  });

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    setSubmitError(null);
    setSuccess(false);
    onClose();
  };

  const onSubmit = async (values: ApiKeyInput) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/proxy/auth/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange_api_key: values.exchange_api_key,
          exchange_api_secret: values.exchange_api_secret,
          exchange_type: DEFAULT_EXCHANGE_TYPE,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : "Couldn’t save that — please try again.",
        );
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => {
        setSuccess(false);
        reset();
        onClose();
      }, 1500);
    } catch {
      setSubmitError("Connection issue. Please try again in a moment.");
    }
  };

  const title = isUpdate ? "Update your exchange key" : "Connect your exchange";
  const description = isUpdate
    ? "Swap in a fresh key — your old one gets replaced."
    : "So Aven can keep an eye on your trades alongside Paul’s.";

  return (
    <Modal open={open} onClose={handleClose} title={title} description={description} size="lg">
      {success ? (
        <motion.div
          initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-3 py-8 text-center"
        >
          <CircleCheck
            aria-hidden
            strokeWidth={1.5}
            className="size-14 text-emerald"
          />
          <p className="text-base font-medium text-foreground">
            You&apos;re connected
          </p>
          <p className="text-sm text-muted-foreground">
            Aven sees your trades from here on.
          </p>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {!isUpdate && (
            <div className="space-y-3 rounded-lg border border-border bg-surface/40 p-4 text-sm">
              <p className="font-medium text-foreground">Why connect?</p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-emerald">•</span>
                  Aven knows your open positions, not just Paul&apos;s
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald">•</span>
                  Personalized setup-checks before you enter a trade
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald">•</span>
                  Heads-up alerts when your positions approach risk thresholds
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Skip for now? No problem — you&apos;ll still see Paul&apos;s
                trades and the daily briefing. You can connect anytime.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-emerald/20 bg-emerald/[0.04] p-4 text-sm text-foreground">
            <p className="font-medium">Two-minute setup on your exchange</p>
            <p className="mt-1 text-muted-foreground">
              Create a <span className="text-foreground">read-only</span> API
              key (no withdrawal permission needed). When the exchange asks for
              IP restrictions, paste{" "}
              <span className="font-mono text-foreground">145.79.11.110</span>{" "}
              — that locks the key to our server only. Works with Binance,
              Bybit, OKX, or any major exchange.
            </p>
          </div>

          <div>
            <label htmlFor="exchange_api_key" className={labelClasses}>
              API key
            </label>
            <input
              id="exchange_api_key"
              type="text"
              autoComplete="off"
              aria-invalid={errors.exchange_api_key ? "true" : undefined}
              className={`${inputClasses} mt-2 font-mono text-sm`}
              {...register("exchange_api_key")}
            />
            {errors.exchange_api_key && (
              <p role="alert" className={errorClasses}>
                {errors.exchange_api_key.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="exchange_api_secret" className={labelClasses}>
              API secret
            </label>
            <input
              id="exchange_api_secret"
              type="password"
              autoComplete="off"
              aria-invalid={errors.exchange_api_secret ? "true" : undefined}
              className={`${inputClasses} mt-2 font-mono text-sm`}
              {...register("exchange_api_secret")}
            />
            {errors.exchange_api_secret && (
              <p role="alert" className={errorClasses}>
                {errors.exchange_api_secret.message}
              </p>
            )}
          </div>

          {submitError && (
            <p role="alert" className={submitErrorClasses}>
              {submitError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className={buttonPrimaryClasses}
            >
              {isSubmitting ? "Saving…" : isUpdate ? "Update key" : "Connect"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={buttonSecondaryClasses}
            >
              {isUpdate ? "Cancel" : "Maybe later"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
