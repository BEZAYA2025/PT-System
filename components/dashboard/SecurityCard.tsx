"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLock, IconLoader2 } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  buttonPrimaryClasses,
  cardClasses,
  errorClasses,
  inputClasses,
  labelClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { Toast, type ToastState } from "@/components/Toast";
import { useImpersonation } from "@/lib/use-impersonation";
import { SettingsCardHeader } from "./SettingsCardHeader";

const changeSchema = z
  .object({
    current_password: z
      .string()
      .min(1, { error: "Enter your current password." }),
    new_password: z
      .string()
      .min(12, { error: "Use at least 12 characters." })
      .max(200, { error: "200 characters max." }),
    confirm: z.string(),
  })
  .refine((d) => d.new_password === d.confirm, {
    message: "Passwords don't match.",
    path: ["confirm"],
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: "Pick something different from your current password.",
    path: ["new_password"],
  });

type ChangeInput = z.infer<typeof changeSchema>;

export function SecurityCard() {
  const router = useRouter();
  const { active: impersonating } = useImpersonation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentPasswordError, setCurrentPasswordError] = useState<
    string | null
  >(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeInput>({
    resolver: zodResolver(changeSchema),
  });

  const onSubmit = async (data: ChangeInput) => {
    setSubmitError(null);
    setCurrentPasswordError(null);
    try {
      const res = await fetch("/api/proxy/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: data.current_password,
          new_password: data.new_password,
        }),
      });
      const resp = (await res.json().catch(() => null)) as {
        message?: string;
        error?: string;
      } | null;

      if (res.status === 401) {
        setCurrentPasswordError("Current password incorrect.");
        return;
      }
      if (res.status === 400) {
        setSubmitError(
          resp?.message ?? resp?.error ?? "That password isn't allowed.",
        );
        return;
      }
      if (!res.ok) {
        setToast({
          message: "Something went wrong, try again.",
          tone: "error",
        });
        return;
      }

      // Success. The backend almost always revokes the session on a
      // password rotation; sign out locally to clear the cookie and
      // bounce to /signin where the member re-authenticates with the
      // new credential.
      reset();
      try {
        await fetch("/api/proxy/auth/signout", { method: "POST" });
      } catch {
        // ignore — redirect below still takes them away from authed UI
      }
      setToast({
        message: "Password changed. Please sign in again.",
        tone: "success",
      });
      // Small delay so the toast is visible before the redirect.
      window.setTimeout(() => {
        window.location.href = "/signin";
      }, 800);
    } catch {
      setSubmitError("Connection issue. Try again.");
    }
  };

  const newPw = watch("new_password") ?? "";
  const strength = scorePassword(newPw);

  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Security · Password"
        title="Password"
        description="Change your sign-in password. You'll be signed out and asked to log in again."
        icon={<IconLock size={18} stroke={1.75} aria-hidden />}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="mt-6 space-y-5"
      >
        <div>
          <label htmlFor="security-current" className={labelClasses}>
            Current password
          </label>
          <input
            id="security-current"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(
              errors.current_password || currentPasswordError,
            )}
            className={inputClasses}
            {...register("current_password")}
          />
          {(currentPasswordError || errors.current_password) && (
            <p role="alert" className={errorClasses}>
              {currentPasswordError ?? errors.current_password?.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="security-new" className={labelClasses}>
            New password
          </label>
          <input
            id="security-new"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.new_password)}
            className={inputClasses}
            {...register("new_password")}
          />
          <PasswordStrengthMeter
            score={strength.score}
            label={strength.label}
          />
          {errors.new_password && (
            <p role="alert" className={errorClasses}>
              {errors.new_password.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="security-confirm" className={labelClasses}>
            Confirm new password
          </label>
          <input
            id="security-confirm"
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
          disabled={isSubmitting || impersonating}
          aria-busy={isSubmitting}
          title={impersonating ? "Disabled during impersonation" : undefined}
          className={buttonPrimaryClasses}
        >
          {isSubmitting ? (
            <>
              <IconLoader2
                size={14}
                stroke={2.25}
                className="mr-2 animate-spin"
                aria-hidden
              />
              Changing…
            </>
          ) : (
            "Change password"
          )}
        </button>
      </form>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </section>
  );
}

// Heuristic only; the real rule lives on the schema (min 12). Kept
// inline (not shared with OnboardClient) so this card stays a single
// drop-in file with no cross-component coupling.
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
  const tone =
    score <= 1
      ? "bg-red-500/70"
      : score === 2
        ? "bg-amber-400/80"
        : "bg-emerald";
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex flex-1 gap-1">
        {segments.map((i) => {
          const active = i < score;
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
