"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const search = useSearchParams();
  const redirectTo = search.get("redirect") ?? "/dashboard";

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInInput) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/proxy/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setSubmitError("Invalid email or password.");
        return;
      }
      if (res.status === 429) {
        setSubmitError("Too many attempts. Please try again later.");
        return;
      }
      if (!res.ok) {
        setSubmitError(
          typeof data?.message === "string"
            ? data.message
            : "Sign-in failed. Please try again.",
        );
        return;
      }

      // Cookie is set by the proxy. Send the user where they were headed.
      const safeRedirect = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
      router.replace(safeRedirect);
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
      aria-describedby={submitError ? "signin-error" : undefined}
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
        disabled={isSubmitting}
        className={`${buttonPrimaryClasses} w-full`}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
