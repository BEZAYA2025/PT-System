"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { IconLoader2 } from "@tabler/icons-react";
import {
  buttonPrimaryClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";

const STORAGE_KEY = "onboarding_token";
const ACCESS_TOKEN_KEY = "access_token";

const onboardSchema = z
  .object({
    password: z
      .string()
      .min(12, { error: "Use at least 12 characters." })
      .max(200, { error: "200 characters max." }),
    confirm: z.string(),
    display_name: z
      .string()
      .trim()
      .max(60, { error: "60 characters max." })
      .optional(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  });

type OnboardInput = z.infer<typeof onboardSchema>;

type TokenSource = "url" | "storage";

export function OnboardClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [tokenSource, setTokenSource] = useState<TokenSource | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<OnboardInput>({
    resolver: zodResolver(onboardSchema),
  });

  // Resolve onboarding token on mount. The backend's welcome email
  // links straight to /onboard?token=… (the signup_token flow), so
  // the URL param wins. Fall back to the localStorage handoff from
  // /verify-email, then to /verify-email's private-session
  // ?onboarding_token=… query-param fallback. Bounce to /signin only
  // if nothing resolves.
  useEffect(() => {
    const urlToken = params.get("token");
    if (urlToken) {
      setToken(urlToken);
      setTokenSource("url");
      setTokenChecked(true);
      return;
    }

    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore — fall through to query param
    }
    if (!stored) {
      stored = params.get("onboarding_token");
    }
    if (!stored) {
      router.replace("/signin");
      return;
    }
    setToken(stored);
    setTokenSource("storage");
    setTokenChecked(true);
  }, [params, router]);

  const onSubmit = async (data: OnboardInput) => {
    if (!token || !tokenSource) return;
    setSubmitError(null);
    const trimmedName = data.display_name ? data.display_name.trim() : undefined;
    try {
      const res =
        tokenSource === "url"
          ? await fetch("/api/proxy/auth/complete-signup", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                password: data.password,
                display_name: trimmedName,
              }),
            })
          : await fetch("/api/proxy/auth/complete-onboarding", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                password: data.password,
                display_name: trimmedName,
              }),
            });
      const resp = (await res.json().catch(() => null)) as {
        access_token?: string;
        error?: string;
      } | null;

      if (!res.ok) {
        setSubmitError(
          resp?.error ?? "Couldn't complete setup. Try again.",
        );
        return;
      }

      // Clean up: the onboarding token is single-use now. Store the
      // returned access_token as a client-readable copy (the
      // canonical session is the httpOnly cookie the backend's
      // Set-Cookie header just established — this is for any
      // client-side fetches that need the bearer).
      try {
        localStorage.removeItem(STORAGE_KEY);
        if (resp?.access_token) {
          localStorage.setItem(ACCESS_TOKEN_KEY, resp.access_token);
        }
      } catch {
        // ignore — cookie carries the session regardless
      }

      router.push("/dashboard");
    } catch {
      setSubmitError("Connection issue. Try again.");
    }
  };

  if (!tokenChecked || !token) {
    return null;
  }

  const password = watch("password") ?? "";
  const strength = scorePassword(password);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5"
    >
      <div>
        <label htmlFor="onboard-password" className={labelClasses}>
          Password
        </label>
        <input
          id="onboard-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby="onboard-password-help"
          className={inputClasses}
          {...register("password")}
        />
        <PasswordStrengthMeter
          score={strength.score}
          label={strength.label}
        />
        {errors.password && (
          <p id="onboard-password-help" role="alert" className={errorClasses}>
            {errors.password.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="onboard-confirm" className={labelClasses}>
          Confirm password
        </label>
        <input
          id="onboard-confirm"
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

      <div>
        <label htmlFor="onboard-display-name" className={labelClasses}>
          Display name <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="onboard-display-name"
          type="text"
          autoComplete="nickname"
          maxLength={60}
          className={inputClasses}
          {...register("display_name")}
        />
        {errors.display_name && (
          <p role="alert" className={errorClasses}>
            {errors.display_name.message}
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
            Setting up…
          </>
        ) : (
          "Continue to dashboard →"
        )}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Password strength — cheap heuristic, just to give members feedback
// while they pick. Backed by `min(12)` on the schema for the real
// rule.
// ---------------------------------------------------------------------------

function scorePassword(s: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  if (!s) return { score: 0, label: "—" };
  let n = 0;
  if (s.length >= 12) n++;
  if (s.length >= 16) n++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) n++;
  if (/\d/.test(s)) n++;
  if (/[^A-Za-z0-9]/.test(s)) n++;
  const score = Math.min(4, n) as 0 | 1 | 2 | 3 | 4;
  const labels: ReadonlyArray<string> = [
    "Too short",
    "Weak",
    "Fair",
    "Strong",
    "Excellent",
  ];
  return { score, label: labels[score] };
}

function PasswordStrengthMeter({
  score,
  label,
}: {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}) {
  const segments = [0, 1, 2, 3] as const;
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {segments.map((i) => {
          const active = i < score;
          const tone =
            score <= 1
              ? "bg-red-500/70"
              : score === 2
                ? "bg-amber-400/80"
                : "bg-emerald";
          return (
            <span
              key={i}
              aria-hidden
              className={`h-1 flex-1 rounded-full transition-colors ${
                active ? tone : "bg-border"
              }`}
            />
          );
        })}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
