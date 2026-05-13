"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  buttonPrimaryClasses,
  buttonSecondaryClasses,
  inputClasses,
  submitErrorClasses,
} from "@/lib/ui";

export type TierId = "standard" | "vip";

export interface TierCardProps {
  tier: TierId;
  title: string;
  priceLabel: string;
  priceCadence: string;
  description: string;
  features: string[];
  recommended?: boolean;
  ctaLabel?: string;
}

export function TierCard({
  tier,
  title,
  priceLabel,
  priceCadence,
  description,
  features,
  recommended = false,
  ctaLabel = "Subscribe Now",
}: TierCardProps) {
  const [coupon, setCoupon] = useState("");
  const [showCoupon, setShowCoupon] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          coupon: coupon.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Could not start checkout. Please try again.",
        );
        return;
      }

      const url =
        typeof data?.url === "string"
          ? data.url
          : typeof data?.checkout_url === "string"
            ? data.checkout_url
            : null;

      if (!url) {
        setError("Backend did not return a checkout URL.");
        return;
      }

      window.location.assign(url);
    } catch {
      setError("Connection issue. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={[
        "relative flex flex-col rounded-2xl border bg-surface/40 p-6 sm:p-8",
        recommended
          ? "border-emerald/40 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_0_60px_-20px_rgba(16,185,129,0.45)]"
          : "border-border",
      ].join(" ")}
    >
      {recommended && (
        <span className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-background px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald">
          Recommended
        </span>
      )}

      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>

      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-foreground">
          {priceLabel}
        </span>
        <span className="text-sm text-muted-foreground">{priceCadence}</span>
      </div>

      <ul className="mt-8 space-y-3 text-sm text-foreground">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <Check
              aria-hidden="true"
              strokeWidth={2}
              className="mt-0.5 size-4 shrink-0 text-emerald"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3">
        {showCoupon ? (
          <div>
            <label htmlFor={`coupon-${tier}`} className="sr-only">
              Promo code
            </label>
            <input
              id={`coupon-${tier}`}
              type="text"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Promo code"
              className={inputClasses}
              autoComplete="off"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCoupon(true)}
            className="self-start text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Have a code?
          </button>
        )}

        {error && (
          <p role="alert" className={submitErrorClasses}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubscribe}
          disabled={pending}
          className={recommended ? buttonPrimaryClasses : buttonSecondaryClasses}
        >
          {pending ? "Loading…" : ctaLabel}
        </button>
      </div>
    </div>
  );
}
