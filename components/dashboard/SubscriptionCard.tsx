"use client";

import { useState } from "react";
import type { SubscriptionStatus, Tier } from "@/lib/dal";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { TierBadge } from "./TierBadge";

function formatStatus(s: SubscriptionStatus): string {
  if (!s) return "—";
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function SubscriptionCard({
  tier,
  status,
  periodEnd,
}: {
  tier: Tier;
  status: SubscriptionStatus;
  periodEnd: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePortal = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Could not open billing portal.",
        );
        return;
      }
      const url =
        typeof data?.url === "string"
          ? data.url
          : typeof data?.portal_url === "string"
            ? data.portal_url
            : null;
      if (!url) {
        setError("Backend did not return a portal URL.");
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
    <section className={cardClasses}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Subscription
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage payment method, change tier, or cancel.
          </p>
        </div>
        <TierBadge tier={tier} />
      </div>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </dt>
          <dd className="mt-1 font-mono text-foreground">
            {formatStatus(status)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Next billing
          </dt>
          <dd className="mt-1 font-mono text-foreground">
            {formatDate(periodEnd)}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className={`${submitErrorClasses} mt-4`}>
          {error}
        </p>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={handlePortal}
          disabled={pending}
          className={buttonSecondaryClasses}
        >
          {pending ? "Opening portal…" : "Manage subscription"}
        </button>
      </div>
    </section>
  );
}
