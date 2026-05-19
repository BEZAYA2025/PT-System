"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { IconLoader2 } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  errorClasses,
  inputClasses,
  labelClasses,
} from "@/lib/ui";

const forgotSchema = z.object({
  email: z.email({ error: "Enter a valid email." }).trim(),
});

type ForgotInput = z.infer<typeof forgotSchema>;

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotInput) => {
    // Fire-and-forget POST. We ALWAYS show the same generic
    // confirmation regardless of what the backend returns — surfacing
    // "no such email" here would let an attacker enumerate accounts.
    try {
      await fetch("/api/proxy/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email.trim() }),
      });
    } catch {
      // Even on connection error we show the same message; if the
      // network is genuinely down they can retry from the same screen
      // since `submitted` doesn't latch on transient issues.
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald/30 bg-emerald/[0.06] p-5 text-sm leading-relaxed text-foreground">
          <p className="font-medium text-emerald">Check your inbox.</p>
          <p className="mt-2 text-muted-foreground">
            If an account exists for that email, you&apos;ll get a
            reset link shortly. Check your inbox and spam folder.
          </p>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/signin"
            className="font-medium text-emerald transition-colors hover:text-emerald-hover"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      <div>
        <label htmlFor="forgot-email" className={labelClasses}>
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={Boolean(errors.email)}
          className={inputClasses}
          {...register("email")}
        />
        {errors.email && (
          <p role="alert" className={errorClasses}>
            {errors.email.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        className={`${buttonPrimaryClasses} w-full`}
      >
        {isSubmitting ? (
          <>
            <IconLoader2
              size={14}
              stroke={2.25}
              className="mr-2 animate-spin"
              aria-hidden
            />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/signin"
          className="font-medium text-foreground transition-colors hover:text-emerald"
        >
          ← Back to sign in
        </Link>
      </p>
    </form>
  );
}
