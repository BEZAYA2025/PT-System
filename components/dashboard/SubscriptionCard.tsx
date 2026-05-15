"use client";

import { useState } from "react";
import { IconCreditCard } from "@tabler/icons-react";
import type { SubscriptionStatus, Tier } from "@/lib/dal";
import {
  buttonSecondaryClasses,
  cardClasses,
  submitErrorClasses,
} from "@/lib/ui";
import { TierBadge } from "./TierBadge";
import { SettingsCardHeader } from "./SettingsCardHeader";

function formatStatus(s: SubscriptionStatus): string {
  if (!s) return "—";
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function statusTone(s: SubscriptionStatus): {
  border: string;
  bg: string;
  text: string;
  dot: string;
} {
  if (s === "active" || s === "trialing") {
    return {
      border: "border-emerald/30",
      bg: "bg-emerald/[0.06]",
      text: "text-emerald",
      dot: "bg-emerald",
    };
  }
  if (s === "past_due" || s === "incomplete" || s === "unpaid") {
    return {
      border: "border-amber-500/30",
      bg: "bg-amber-500/[0.06]",
      text: "text-amber-300",
      dot: "bg-amber-300",
    };
  }
  if (s === "canceled" || s === "incomplete_expired") {
    return {
      border: "border-red-500/30",
      bg: "bg-red-500/[0.06]",
      text: "text-red-300",
      dot: "bg-red-300",
    };
  }
  return {
    border: "border-border",
    bg: "bg-surface",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
}

function formatDate(input: string | number | null): string {
  if (input === null || input === "" || input === 0) return "—";
  try {
    const d =
      typeof input === "number"
        ? new Date(input > 1e12 ? input : input * 1000)
        : new Date(input);
    if (Number.isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(input);
  }
}

function relativeDays(input: string | number | null): string | null {
  if (input === null || input === "" || input === 0) return null;
  try {
    const d =
      typeof input === "number"
        ? new Date(input > 1e12 ? input : input * 1000)
        : new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
    if (days < -1) return `${Math.abs(days)} days ago`;
    if (days === -1) return "yesterday";
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return `in ${days} days`;
  } catch {
    return null;
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

  const tone = statusTone(status);
  const dateRel = relativeDays(periodEnd);

  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Billing · Subscription"
        title="Subscription"
        description="Manage payment method, change tier, or cancel."
        icon={<IconCreditCard size={18} stroke={1.75} aria-hidden />}
        right={
          status ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.border} ${tone.bg} ${tone.text}`}
            >
              <span aria-hidden className={`size-1.5 rounded-full ${tone.dot}`} />
              {formatStatus(status)}
            </span>
          ) : null
        }
      />

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Tier
          </dt>
          <dd className="mt-1">
            <TierBadge tier={tier} />
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            Next billing
          </dt>
          <dd className="mt-1 font-mono text-foreground">
            {formatDate(periodEnd)}
            {dateRel && (
              <span className="ml-2 font-sans text-xs text-muted-foreground">
                · {dateRel}
              </span>
            )}
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
