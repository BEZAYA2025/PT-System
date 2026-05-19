"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { IconAlertCircle, IconLoader2, IconMailbox } from "@tabler/icons-react";

// /verify-email — exchanges the URL token for an onboarding token,
// stores it in localStorage, and forwards the visitor to /onboard.
// Three render states:
//   · verifying — initial POST in flight
//   · expired   — backend returned non-OK; offer resend
//   · success   — onboarding_token stored; browser is about to
//                 navigate away to /onboard. Showing a brief
//                 "Verified — redirecting…" message rather than a
//                 blank flash.

type State =
  | { status: "verifying" }
  | { status: "expired"; reason: string }
  | { status: "success" };

const STORAGE_KEY = "onboarding_token";

export function VerifyEmailFlow() {
  const params = useSearchParams();
  const router = useRouter();

  // Decide the initial render state synchronously from the URL — that
  // way the "missing token" branch doesn't need a setState inside an
  // effect (which the React Compiler flags as a cascading render). The
  // useEffect below only runs the actual async POST when there IS a
  // token to verify.
  const token = (params.get("token") ?? "").trim();
  const [state, setState] = useState<State>(
    token
      ? { status: "verifying" }
      : {
          status: "expired",
          reason: "This link is missing its verification token.",
        },
  );
  const [resendState, setResendState] = useState<{
    status: "idle" | "sending" | "sent" | "error";
    message?: string;
  }>({ status: "idle" });

  // React 18 StrictMode runs effects twice in dev; guard with a ref
  // so we don't POST the token twice (most backends mark
  // verification tokens single-use, so the second call would 4xx).
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || !token) return;
    fired.current = true;

    void (async () => {
      try {
        const res = await fetch("/api/proxy/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => null)) as {
          onboarding_token?: string;
          error?: string;
        } | null;

        if (!res.ok || !data?.onboarding_token) {
          setState({
            status: "expired",
            reason:
              data?.error ?? "This link has expired or is invalid.",
          });
          return;
        }

        try {
          localStorage.setItem(STORAGE_KEY, data.onboarding_token);
        } catch {
          // localStorage can throw in a private session — fall through
          // to /onboard with the token in a query string as a fallback.
          router.replace(
            `/onboard?onboarding_token=${encodeURIComponent(data.onboarding_token)}`,
          );
          return;
        }

        setState({ status: "success" });
        router.replace("/onboard");
      } catch {
        setState({
          status: "expired",
          reason: "Couldn't reach the verification server. Try again.",
        });
      }
    })();
  }, [token, router]);

  const resend = async () => {
    const email = window.prompt(
      "Enter the email address you signed up with — we'll send a fresh verification link:",
    );
    if (!email) return;
    setResendState({ status: "sending" });
    try {
      const res = await fetch("/api/proxy/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok && res.status !== 202) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setResendState({
          status: "error",
          message: data?.error ?? "Couldn't send. Try again in a moment.",
        });
        return;
      }
      setResendState({
        status: "sent",
        message: "Check your inbox — a fresh link is on its way.",
      });
    } catch {
      setResendState({
        status: "error",
        message: "Connection issue. Try again.",
      });
    }
  };

  if (state.status === "verifying") {
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
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Verifying your email…
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Just a moment while we confirm your link.
        </p>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div className="rounded-2xl border border-emerald/30 bg-emerald/[0.05] p-8 text-center sm:p-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Verified.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Taking you to set your password…
        </p>
      </div>
    );
  }

  // expired
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-8 sm:p-10">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-red-500/[0.08] text-red-300">
          <IconAlertCircle size={16} stroke={1.75} aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Link expired or invalid
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {state.reason}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={
            resendState.status === "sending" || resendState.status === "sent"
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald px-5 text-sm font-semibold text-background transition-colors hover:bg-emerald-hover disabled:cursor-not-allowed disabled:opacity-70"
        >
          {resendState.status === "sending" ? (
            <>
              <IconLoader2
                size={14}
                stroke={2.25}
                className="animate-spin"
                aria-hidden
              />
              Sending…
            </>
          ) : (
            <>
              <IconMailbox size={14} stroke={1.75} aria-hidden />
              Resend verification email
            </>
          )}
        </button>
        {resendState.message && (
          <p
            role={resendState.status === "error" ? "alert" : "status"}
            className={`mt-3 text-sm ${
              resendState.status === "error"
                ? "text-red-300"
                : "text-emerald"
            }`}
          >
            {resendState.message}
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Or{" "}
        <Link
          href="/signin"
          className="text-emerald transition-colors hover:text-emerald-hover"
        >
          sign in
        </Link>{" "}
        if you&apos;ve already set your password.
      </p>
    </div>
  );
}
