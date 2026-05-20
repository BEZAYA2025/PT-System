"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  buttonPrimaryClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";

const signInSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
  password: z
    .string()
    .min(1, { error: "Password is required." })
    .max(200),
});

type SignInInput = z.infer<typeof signInSchema>;

export function SignInForm() {
  const search = useSearchParams();
  const redirectTo = search.get("redirect") ?? "/dashboard";
  // `?reset=1` after a successful /reset-password submit — surface a
  // one-shot confirmation banner above the form so members see their
  // password was updated before signing back in.
  const resetConfirmed = search.get("reset") === "1";

  const [submitError, setSubmitError] = useState<string | null>(null);

  // LOGIN-1 (v2): one source of truth instead of mixing
  // react-hook-form's isSubmitting with a separate `redirecting` flag —
  // the two flags batched differently across renders and the button
  // could briefly flash back to "Sign in" between submitting and
  // redirecting. A single phase variable that we control end-to-end
  // means the label only ever moves forward through the sequence
  // idle → submitting → redirecting, never back.
  type Phase = "idle" | "submitting" | "redirecting";
  const [phase, setPhase] = useState<Phase>("idle");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInInput) => {
    setSubmitError(null);
    setPhase("submitting");
    try {
      const res = await fetch("/api/proxy/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setSubmitError("Invalid email or password.");
        setPhase("idle");
        return;
      }
      if (res.status === 429) {
        setSubmitError("Too many attempts. Please try again later.");
        setPhase("idle");
        return;
      }
      if (!res.ok) {
        setSubmitError(
          typeof data?.message === "string"
            ? data.message
            : "Sign-in failed. Please try again.",
        );
        setPhase("idle");
        return;
      }

      // Cookie is set by the proxy. Send the user where they were headed.
      const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
      setPhase("redirecting");
      // LOGIN-3: a soft router.replace raced with the cookie commit on
      // some clients — the RSC fetch for /dashboard occasionally ran
      // before the Set-Cookie response was fully applied, so the
      // server-rendered dashboard came back unauthenticated and the
      // browser sat on a blank screen until a hard reload. A hard
      // navigation guarantees the cookie is committed before the next
      // request goes out. The page is about to unmount so we don't
      // reset `phase` after this — the button stays "Redirecting…"
      // until the new page takes over.
      window.location.replace(safeRedirect);
    } catch {
      setSubmitError("Connection issue. Please try again.");
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";
  const buttonLabel =
    phase === "redirecting"
      ? "Redirecting…"
      : phase === "submitting"
        ? "Signing in…"
        : "Sign in";

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
      aria-describedby={submitError ? "signin-error" : undefined}
    >
      {resetConfirmed && (
        <p
          role="status"
          className="rounded-lg border border-emerald/30 bg-emerald/[0.06] px-4 py-3 text-sm text-emerald"
        >
          Password updated. Sign in with your new password.
        </p>
      )}

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
          className={`${inputClasses} mt-2`}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className={errorClasses}>
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className={labelClasses}>
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? "true" : undefined}
          className={`${inputClasses} mt-2`}
          {...register("password")}
        />
        {errors.password && (
          <p role="alert" className={errorClasses}>
            {errors.password.message}
          </p>
        )}
        <p className="mt-2 text-right text-xs">
          <Link
            href="/forgot-password"
            className="text-muted-foreground transition-colors hover:text-emerald"
          >
            Forgot password?
          </Link>
        </p>
      </div>

      {submitError && (
        <p id="signin-error" role="alert" className={submitErrorClasses}>
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className={`${buttonPrimaryClasses} w-full`}
      >
        {buttonLabel}
      </button>
    </form>
  );
}
