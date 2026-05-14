"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  buttonPrimaryClasses,
  errorClasses,
  helperClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { TelegramLinkCard } from "./TelegramLinkCard";

const onboardSchema = z
  .object({
    password: z
      .string()
      .min(12, { error: "At least 12 characters." })
      .max(200),
    password_confirm: z.string(),
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
  })
  .refine((d) => d.password === d.password_confirm, {
    path: ["password_confirm"],
    error: "Passwords don't match.",
  });

type OnboardInput = z.infer<typeof onboardSchema>;

interface CompleteResponse {
  telegram_link_url?: string;
  telegram_link_token?: string;
}

export function OnboardForm({
  token,
  email,
  tier,
}: {
  token: string;
  email: string;
  tier: string;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompleteResponse | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardInput>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      password: "",
      password_confirm: "",
      binance_api_key: "",
      binance_api_secret: "",
    },
  });

  const onSubmit = async (values: OnboardInput) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/proxy/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
          binance_api_key: values.binance_api_key,
          binance_api_secret: values.binance_api_secret,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          typeof data?.message === "string"
            ? data.message
            : "Could not complete signup. Please try again.",
        );
        return;
      }

      setCompleted({
        telegram_link_url:
          typeof data?.telegram_link_url === "string"
            ? data.telegram_link_url
            : undefined,
        telegram_link_token:
          typeof data?.telegram_link_token === "string"
            ? data.telegram_link_token
            : undefined,
      });
    } catch {
      setSubmitError("Connection issue. Please try again.");
    }
  };

  if (completed) {
    return (
      <TelegramLinkCard
        telegramLinkUrl={completed.telegram_link_url}
        tier={tier}
      />
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
      aria-describedby={submitError ? "onboard-error" : undefined}
    >
      <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
        <p className="text-muted-foreground">Setting up</p>
        <p className="font-medium text-foreground">{email}</p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald">
          {tier} tier
        </p>
      </div>

      <div>
        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? "true" : undefined}
          className={`${inputClasses} mt-2`}
          {...register("password")}
        />
        <p className={helperClasses}>At least 12 characters.</p>
        {errors.password && (
          <p role="alert" className={errorClasses}>
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password_confirm" className={labelClasses}>
          Confirm password
        </label>
        <input
          id="password_confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password_confirm ? "true" : undefined}
          className={`${inputClasses} mt-2`}
          {...register("password_confirm")}
        />
        {errors.password_confirm && (
          <p role="alert" className={errorClasses}>
            {errors.password_confirm.message}
          </p>
        )}
      </div>

      <div className="rounded-lg border border-emerald/20 bg-emerald/[0.04] p-4 text-sm text-foreground">
        <p className="font-medium">Binance API key — read-only</p>
        <p className="mt-1 text-muted-foreground">
          Create the key with{" "}
          <span className="font-mono text-foreground">
            IP restriction → 145.79.11.110
          </span>{" "}
          and{" "}
          <span className="font-mono text-foreground">read-only</span>{" "}
          permissions. Required for security — no withdrawal access is ever
          requested.
        </p>
      </div>

      <div>
        <label htmlFor="binance_api_key" className={labelClasses}>
          Binance API key
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
          Binance API secret
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

      {submitError && (
        <p id="onboard-error" role="alert" className={submitErrorClasses}>
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={`${buttonPrimaryClasses} w-full`}
      >
        {isSubmitting ? "Setting up your account…" : "Complete setup"}
      </button>
    </form>
  );
}
