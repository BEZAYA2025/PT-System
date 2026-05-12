"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  waitlistSchema,
  type WaitlistInput,
  tradingExperienceOptions,
  marketOptions,
} from "@/lib/waitlist-schema";

const fieldClasses =
  "w-full rounded-lg border border-border bg-surface/40 px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-emerald focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald";

const labelClasses =
  "block text-sm font-medium text-foreground";

const helperClasses = "mt-2 text-xs text-muted-foreground";

const errorClasses = "mt-2 text-xs text-red-400";

export function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistInput>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
      name: "",
      markets: [],
      challenge: "",
      referral: "",
    },
  });

  const onSubmit = async (values: WaitlistInput) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(
          typeof data?.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
        );
        return;
      }
      setSubmitted(true);
    } catch {
      setSubmitError("Network error. Please try again.");
    }
  };

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald/30 bg-emerald/[0.04] p-8 text-center sm:p-10"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex size-10 items-center justify-center rounded-full border border-emerald/40 bg-emerald/10"
        >
          <span className="size-2 rounded-full bg-emerald" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
          You&apos;re on the list.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          We&apos;ll be in touch when Beta opens.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-8"
      aria-describedby={submitError ? "form-error" : undefined}
    >
      <div>
        <label htmlFor="email" className={labelClasses}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@domain.com"
          aria-invalid={errors.email ? "true" : undefined}
          className={`${fieldClasses} mt-2`}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className={errorClasses}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="name" className={labelClasses}>
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          aria-invalid={errors.name ? "true" : undefined}
          className={`${fieldClasses} mt-2`}
          {...register("name")}
        />
        {errors.name && (
          <p role="alert" className={errorClasses}>
            {errors.name.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="experience" className={labelClasses}>
          Trading experience
        </label>
        <div className="relative mt-2">
          <select
            id="experience"
            defaultValue=""
            aria-invalid={errors.experience ? "true" : undefined}
            className={`${fieldClasses} appearance-none pr-10`}
            {...register("experience")}
          >
            <option value="" disabled>
              Select an option
            </option>
            {tradingExperienceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            ↓
          </span>
        </div>
        {errors.experience && (
          <p role="alert" className={errorClasses}>
            {errors.experience.message}
          </p>
        )}
      </div>

      <fieldset>
        <legend className={labelClasses}>What do you trade?</legend>
        <p className={helperClasses}>Pick all that apply.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {marketOptions.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface/30 px-4 py-3 text-[15px] text-foreground transition-colors hover:border-foreground/30 has-[input:checked]:border-emerald/60 has-[input:checked]:bg-emerald/[0.06]"
            >
              <input
                type="checkbox"
                value={o.value}
                className="size-4 cursor-pointer accent-emerald"
                {...register("markets")}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {errors.markets && (
          <p role="alert" className={errorClasses}>
            {errors.markets.message}
          </p>
        )}
      </fieldset>

      <div>
        <label htmlFor="challenge" className={labelClasses}>
          What&apos;s your biggest trading challenge?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="challenge"
          rows={4}
          placeholder="e.g. consistent risk management, FOMO, finding setups..."
          className={`${fieldClasses} mt-2 resize-y`}
          {...register("challenge")}
        />
      </div>

      <div>
        <label htmlFor="referral" className={labelClasses}>
          How did you hear about us?{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="referral"
          type="text"
          className={`${fieldClasses} mt-2`}
          {...register("referral")}
        />
      </div>

      {submitError && (
        <p
          id="form-error"
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300"
        >
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-emerald px-8 text-sm font-medium text-background transition-colors duration-200 hover:bg-emerald-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
