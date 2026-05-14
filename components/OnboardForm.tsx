"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const onboardSchema = z
  .object({
    password: z
      .string()
      .min(12, { error: "At least 12 characters." })
      .max(200),
    password_confirm: z.string(),
    display_name: z
      .string()
      .max(80, { error: "Keep it under 80 characters." })
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => d.password === d.password_confirm, {
    path: ["password_confirm"],
    error: "Passwords don't match.",
  });

type OnboardInput = z.infer<typeof onboardSchema>;

export function OnboardForm({
  token,
  email,
  tier,
}: {
  token: string;
  email: string;
  tier: string;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardInput>({
    resolver: zodResolver(onboardSchema),
    defaultValues: {
      password: "",
      password_confirm: "",
      display_name: "",
    },
  });

  const onSubmit = async (values: OnboardInput) => {
    setSubmitError(null);
    try {
      const trimmedName = (values.display_name ?? "").trim();
      const res = await fetch("/api/proxy/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: values.password,
          display_name: trimmedName.length > 0 ? trimmedName : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSubmitError(
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : "Could not complete signup. Please try again.",
        );
        return;
      }

      // Access-token cookie was captured by the proxy. Send the user into
      // the dashboard — Telegram + Binance linking now happen from the
      // Setup-Progress card.
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setSubmitError("Connection issue. Please try again.");
    }
  };

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

      <div>
        <label htmlFor="display_name" className={labelClasses}>
          Display name{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="display_name"
          type="text"
          autoComplete="nickname"
          placeholder="What should Aven call you?"
          aria-invalid={errors.display_name ? "true" : undefined}
          className={`${inputClasses} mt-2`}
          {...register("display_name")}
        />
        <p className={helperClasses}>
          Used in briefings and chat. You can change it later.
        </p>
        {errors.display_name && (
          <p role="alert" className={errorClasses}>
            {errors.display_name.message}
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
        {isSubmitting ? "Activating your account…" : "Activate account"}
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Almost done — Telegram and your exchange take just a few clicks from
        the dashboard after this.
      </p>
    </form>
  );
}
