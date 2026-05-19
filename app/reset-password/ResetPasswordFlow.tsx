"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { IconAlertCircle, IconLoader2 } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";

// /reset-password — two-stage flow:
//   1. validate token via GET /api/proxy/auth/validate-reset-token
//      (a quick liveness check so we don't show a form for a token
//       that's already expired).
//   2. submit new password via POST /api/proxy/auth/reset-password.
//      On success, redirect to /signin with ?reset=1 so the sign-in
//      page can surface a "Password updated" confirmation.

type TokenState =
  | { status: "validating" }
  | { status: "invalid"; reason: string }
  | { status: "valid"; token: string };

const resetSchema = z
  .object({
    password: z
      .string()
      .min(12, { error: "Use at least 12 characters." })
      .max(200, { error: "200 characters max." }),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

type ResetInput = z.infer<typeof resetSchema>;

export function ResetPasswordFlow() {
  const params = useSearchParams();
  const router = useRouter();

  // Synchronous initial state from the URL so the "no token" branch
  // doesn't need a setState inside an effect — same restructure the
  // verify-email flow uses for the same React Compiler rule.
  const token = (params.get("token") ?? "").trim();
  const [tokenState, setTokenState] = useState<TokenState>(
    token
      ? { status: "validating" }
      : {
          status: "invalid",
          reason: "This link is missing its reset token.",
        },
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fired = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
  });

  // StrictMode-safe single-fire token validation. Only runs when the
  // URL actually carried a token; the no-token state is already set
  // by the useState initialiser above.
  useEffect(() => {
    if (fired.current || !token) return;
    fired.current = true;

    void (async () => {
      try {
        const res = await fetch(
          `/api/proxy/auth/validate-reset-token?token=${encodeURIComponent(token)}`,
          { method: "GET" },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setTokenState({
            status: "invalid",
            reason:
              data?.error ?? "This link has expired or is invalid.",
          });
          return;
        }
        setTokenState({ status: "valid", token });
      } catch {
        setTokenState({
          status: "invalid",
          reason: "Couldn't verify this link. Try again in a moment.",
        });
      }
    })();
  }, [token]);

  const onSubmit = async (data: ResetInput) => {
    if (tokenState.status !== "valid") return;
    setSubmitError(null);
    try {
      const res = await fetch("/api/proxy/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokenState.token,
          new_password: data.password,
        }),
      });
      const resp = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setSubmitError(
          resp?.error ?? "Couldn't update password. Try again.",
        );
        return;
      }
      // Sign-in page reads `?reset=1` and shows a one-shot "Password
      // updated" toast above the form.
      router.push("/signin?reset=1");
    } catch {
      setSubmitError("Connection issue. Try again.");
    }
  };

  if (tokenState.status === "validating") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-10">
        <span className="inline-flex size-12 items-center justify-center rounded-full border border-emerald/25 bg-emerald/[0.06]">
          <IconLoader2
            size={20}
            stroke={1.75}
            className="animate-spin text-emerald"
            aria-hidden
          />
        </span>
        <p className="mt-5 text-sm text-muted-foreground">
          Checking your reset link…
        </p>
      </div>
    );
  }

  if (tokenState.status === "invalid") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-8 sm:p-10">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-red-500/[0.08] text-red-300">
            <IconAlertCircle size={16} stroke={1.75} aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Link expired
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {tokenState.reason}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/forgot-password"
            className={`${buttonPrimaryClasses} w-full sm:w-auto`}
          >
            Request a new reset link
          </Link>
          <Link
            href="/signin"
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-elevated sm:w-auto"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // valid
  return (
    <>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Set a new password
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          Enter your new password below.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-8 space-y-5"
      >
        <div>
          <label htmlFor="reset-password" className={labelClasses}>
            New password
          </label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            className={inputClasses}
            {...register("password")}
          />
          {errors.password && (
            <p role="alert" className={errorClasses}>
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="reset-confirm" className={labelClasses}>
            Confirm new password
          </label>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirm)}
            className={inputClasses}
            {...register("confirm")}
          />
          {errors.confirm && (
            <p role="alert" className={errorClasses}>
              {errors.confirm.message}
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className={submitErrorClasses}>
            {submitError}
          </p>
        )}

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
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </>
  );
}
