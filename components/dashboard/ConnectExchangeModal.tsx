"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { CircleCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { IconArrowLeft, IconExternalLink, IconShieldLock } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { EXCHANGES, type ExchangeDef, type ExchangeId, findExchange } from "@/lib/exchanges";

// ---------------------------------------------------------------------------
// Schema — built dynamically per-exchange so passphrase is only required
// when the picked exchange actually needs one (OKX, KuCoin).
// ---------------------------------------------------------------------------

function buildSchema(needsPassphrase: boolean) {
  const base = z.object({
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
    exchange_passphrase: z.string().max(200).optional(),
  });
  if (!needsPassphrase) return base;
  return base.extend({
    exchange_passphrase: z
      .string()
      .min(1, { error: "Your exchange requires a passphrase." })
      .max(200)
      .trim(),
  });
}

type ApiKeyInput = {
  exchange_api_key: string;
  exchange_api_secret: string;
  exchange_passphrase?: string;
};

// ---------------------------------------------------------------------------
// Step machine. "pick" → "credentials" → "success".
// For the update flow we skip "pick" and pre-load the current exchange.
// ---------------------------------------------------------------------------

type Step = "pick" | "credentials" | "success";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Existing connection — drives copy + starting step. */
  isUpdate?: boolean;
  /** Currently-connected exchange id (from credential_status response).
   *  If present in update mode, the wizard pre-selects this exchange. */
  currentExchangeId?: ExchangeId | null;
  /** Called once the backend confirms a successful save, passing the
   *  human-readable exchange label so the parent can show a toast. */
  onConnectSuccess?: (label: string) => void;
}

export function ConnectExchangeModal({
  open,
  onClose,
  isUpdate = false,
  currentExchangeId = null,
  onConnectSuccess,
}: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();

  // Resolve initial step + selection from the props. In update mode with a
  // known exchange we skip the picker; otherwise the picker is the entry.
  const initialSelection = useMemo(
    () => (currentExchangeId ? findExchange(currentExchangeId) : null),
    [currentExchangeId],
  );
  const initialStep: Step =
    isUpdate && initialSelection ? "credentials" : "pick";

  const [step, setStep] = useState<Step>(initialStep);
  const [selected, setSelected] = useState<ExchangeDef | null>(initialSelection);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset to the prop-derived starting state every time the modal opens.
  // (Without this the wizard would remember a stale step across opens.)
  useEffect(() => {
    if (!open) return;
    setStep(initialStep);
    setSelected(initialSelection);
    setSubmitError(null);
  }, [open, initialStep, initialSelection]);

  const handleClose = () => {
    setSubmitError(null);
    onClose();
  };

  const handlePick = (def: ExchangeDef) => {
    setSelected(def);
    setSubmitError(null);
    setStep("credentials");
  };

  const handleChange = () => {
    setSubmitError(null);
    setStep("pick");
  };

  const title =
    step === "success"
      ? "You're connected"
      : isUpdate
        ? "Update your exchange key"
        : "Connect your exchange";
  const description =
    step === "pick"
      ? "Pick which exchange you trade on. We'll show the exact steps to create a read-only key for that one."
      : step === "credentials" && selected
        ? `Read-only key for ${selected.label}. We never store withdrawal-enabled keys.`
        : "";

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      description={description}
      size="lg"
    >
      {step === "pick" && (
        <ExchangePicker onPick={handlePick} currentExchangeId={currentExchangeId} />
      )}

      {step === "credentials" && selected && (
        <CredentialsForm
          exchange={selected}
          isUpdate={isUpdate}
          submitError={submitError}
          setSubmitError={setSubmitError}
          onChangeExchange={handleChange}
          onSuccess={() => {
            setStep("success");
            onConnectSuccess?.(selected.label);
            router.refresh();
            setTimeout(() => {
              setStep(initialStep);
              setSelected(initialSelection);
              onClose();
            }, 1500);
          }}
        />
      )}

      {step === "success" && (
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
            {selected ? `Connected to ${selected.label}` : "You're connected"}
          </p>
          <p className="text-sm text-muted-foreground">
            Aven sees your trades from here on.
          </p>
        </motion.div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Exchange picker. 9-button grid. Brand-tinted on hover so the
// row reads as a brand row, not generic chips.
// ---------------------------------------------------------------------------

function ExchangePicker({
  onPick,
  currentExchangeId,
}: {
  onPick: (def: ExchangeDef) => void;
  currentExchangeId: ExchangeId | null;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald/20 bg-emerald/[0.04] p-4 text-sm text-foreground">
        <p className="inline-flex items-center gap-2 font-medium">
          <IconShieldLock size={16} stroke={1.75} className="text-emerald" aria-hidden />
          Read-only keys only
        </p>
        <p className="mt-1 text-muted-foreground">
          Aven only needs to <span className="text-foreground">read</span> your
          positions. Never enable trade or withdrawal permissions. We additionally
          IP-lock the key to{" "}
          <span className="font-mono text-foreground">145.79.11.110</span>.
        </p>
      </div>

      <div>
        <p className={`${labelClasses} mb-2`}>Choose your exchange</p>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {EXCHANGES.map((ex) => {
            const isCurrent = ex.id === currentExchangeId;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex)}
                className={[
                  "group relative inline-flex h-14 flex-col items-center justify-center rounded-lg border bg-surface px-3 text-sm font-medium text-foreground transition-all",
                  "hover:border-emerald/50 hover:bg-emerald/[0.06] hover:shadow-[0_0_24px_-12px_rgba(16,185,129,0.6)]",
                  isCurrent
                    ? "border-emerald/40 bg-emerald/[0.04]"
                    : "border-border",
                ].join(" ")}
              >
                <span className="leading-tight">{ex.label}</span>
                {ex.passphrase && (
                  <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground group-hover:text-emerald/80">
                    + passphrase
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute right-1.5 top-1.5 inline-flex size-1.5 rounded-full bg-emerald" />
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Don't see yours? Tell support — we can add new exchanges through the
          same multi-tenant adapter.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Credentials form. Per-exchange hint + conditional passphrase.
// ---------------------------------------------------------------------------

function CredentialsForm({
  exchange,
  isUpdate,
  submitError,
  setSubmitError,
  onChangeExchange,
  onSuccess,
}: {
  exchange: ExchangeDef;
  isUpdate: boolean;
  submitError: string | null;
  setSubmitError: (s: string | null) => void;
  onChangeExchange: () => void;
  onSuccess: () => void;
}) {
  const schema = useMemo(() => buildSchema(exchange.passphrase), [exchange.passphrase]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApiKeyInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      exchange_api_key: "",
      exchange_api_secret: "",
      exchange_passphrase: "",
    },
  });

  // Re-create the form when the user swaps exchange — clears prior input,
  // wipes the previous error message.
  useEffect(() => {
    reset({
      exchange_api_key: "",
      exchange_api_secret: "",
      exchange_passphrase: "",
    });
    setSubmitError(null);
  }, [exchange.id, reset, setSubmitError]);

  const onSubmit = async (values: ApiKeyInput) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/proxy/auth/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exchange_type: exchange.id,
          exchange_api_key: values.exchange_api_key,
          exchange_api_secret: values.exchange_api_secret,
          ...(exchange.passphrase && values.exchange_passphrase
            ? { exchange_passphrase: values.exchange_passphrase }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        const backendMsg =
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : null;
        setSubmitError(
          backendMsg
            ? `${backendMsg} (${res.status})`
            : `Couldn't save that — backend returned ${res.status}.`,
        );
        return;
      }
      onSuccess();
    } catch {
      setSubmitError("Connection issue. Please try again in a moment.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {/* "Currently configuring" pill + change-exchange link */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Connecting
          </span>
          <span className="font-medium text-foreground">{exchange.label}</span>
        </div>
        <button
          type="button"
          onClick={onChangeExchange}
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald transition-colors hover:text-emerald-hover"
        >
          <IconArrowLeft size={12} stroke={2} aria-hidden />
          Change
        </button>
      </div>

      {/* Per-exchange "how to create the key" hint */}
      <div className="rounded-lg border border-emerald/20 bg-emerald/[0.04] p-4 text-sm">
        <p className="font-medium text-foreground">
          Two-minute setup on {exchange.label}
        </p>
        <p className="mt-1 text-muted-foreground">{exchange.hint}</p>
        {exchange.docsUrl && (
          <a
            href={exchange.docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald transition-colors hover:text-emerald-hover"
          >
            <IconExternalLink size={12} stroke={2} aria-hidden />
            Open {exchange.label} docs
          </a>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Set permissions to{" "}
          <span className="text-foreground">read-only</span> (no trade, no
          withdraw). IP-allow{" "}
          <span className="font-mono text-foreground">145.79.11.110</span>.
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

      {exchange.passphrase && (
        <div>
          <label htmlFor="exchange_passphrase" className={labelClasses}>
            Passphrase
            <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald/80">
              required for {exchange.label}
            </span>
          </label>
          <input
            id="exchange_passphrase"
            type="password"
            autoComplete="off"
            aria-invalid={errors.exchange_passphrase ? "true" : undefined}
            className={`${inputClasses} mt-2 font-mono text-sm`}
            {...register("exchange_passphrase")}
          />
          {errors.exchange_passphrase && (
            <p role="alert" className={errorClasses}>
              {errors.exchange_passphrase.message}
            </p>
          )}
        </div>
      )}

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
          {isSubmitting
            ? "Saving…"
            : isUpdate
              ? "Update key"
              : `Connect ${exchange.label}`}
        </button>
        <button
          type="button"
          onClick={onChangeExchange}
          disabled={isSubmitting}
          className={buttonSecondaryClasses}
        >
          ← Different exchange
        </button>
      </div>
    </form>
  );
}
