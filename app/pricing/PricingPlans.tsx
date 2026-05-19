"use client";

import { useState } from "react";
import {
  IconBell,
  IconBrain,
  IconCheck,
  IconEye,
  IconInfinity,
  IconLoader2,
  IconMessageCircle,
  IconMicrophone,
  IconPlugConnected,
  IconShieldCheck,
  IconSun,
  IconTargetArrow,
  IconTicket,
  IconWorld,
  IconX,
  type IconProps,
} from "@tabler/icons-react";

// /pricing — interactive plans surface. One client component owns
// cadence + promo state so both cards stay in sync. The promo input
// sits between the cadence toggle and the cards so members see the
// discount applied right next to the price they're comparing.

type TierId = "standard" | "vip";
type Cadence = "monthly" | "yearly";

type AppliesTo = "standard" | "vip" | "both";

interface ValidPromo {
  code: string;
  discountPct: number;
  durationMonths: number | null;
  appliesTo: AppliesTo;
  badge: string;
}

type PromoState =
  | { status: "idle" }
  | { status: "validating"; code: string }
  | { status: "valid"; promo: ValidPromo }
  | { status: "error"; code: string; error: string };

const PRICES: Record<TierId, Record<Cadence, number>> = {
  standard: { monthly: 99, yearly: 990 },
  vip: { monthly: 299, yearly: 2990 },
};

// Round-34 feature lists — line-art icons replace the emoji bullets
// so Standard and VIP read with the same visual language. Standard
// stays Bitcoin-focused; VIP differentiates on coin coverage,
// reasoning depth, coaching cadence, and risk management.
type TablerIcon = React.ComponentType<IconProps>;
type FeatureItem = { Icon: TablerIcon; label: string };

const STANDARD_FEATURES: ReadonlyArray<FeatureItem> = [
  { Icon: IconMessageCircle, label: "Aven AI Chat — 50 messages a day" },
  { Icon: IconSun, label: "Daily briefing on Bitcoin" },
  { Icon: IconBell, label: "Setup alerts with confluence scoring" },
  { Icon: IconEye, label: "Paul's full trade activity, visible" },
  { Icon: IconMicrophone, label: "Voice messages + annotated charts" },
  {
    Icon: IconPlugConnected,
    label: "Connect any of 9 exchanges (read-only)",
  },
];

const VIP_EXTRAS: ReadonlyArray<FeatureItem> = [
  { Icon: IconInfinity, label: "Unlimited Aven AI Chat" },
  { Icon: IconWorld, label: "Full coverage — all major coins" },
  {
    Icon: IconBrain,
    label: "Aven Deep-Mode — richer reasoning, deeper market analysis",
  },
  {
    Icon: IconTargetArrow,
    label: "Personal trade coaching with weekly reviews",
  },
  {
    Icon: IconShieldCheck,
    label: "Advanced risk management with proactive warnings",
  },
];

const TIER_LABEL: Record<TierId, string> = {
  standard: "Standard",
  vip: "VIP",
};

export function PricingPlans() {
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [code, setCode] = useState("");
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });

  const applyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setPromo({ status: "validating", code: trimmed });
    try {
      const res = await fetch("/api/proxy/checkout/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as
        | {
            valid?: boolean;
            discount_type?: string;
            discount_value?: number;
            duration_months?: number;
            applies_to?: AppliesTo;
            badge?: string;
            error?: string;
            preview_standard?: { badge?: string };
            preview_vip?: { badge?: string };
          }
        | null;

      if (
        !res.ok ||
        !data?.valid ||
        typeof data.discount_value !== "number" ||
        !data.applies_to
      ) {
        setPromo({
          status: "error",
          code: trimmed,
          error: data?.error ?? "Invalid or expired code.",
        });
        return;
      }

      const badge =
        data.badge ??
        data.preview_standard?.badge ??
        data.preview_vip?.badge ??
        `${data.discount_value}% off${
          data.duration_months
            ? ` first ${data.duration_months} months`
            : ""
        }`;

      setPromo({
        status: "valid",
        promo: {
          code: trimmed,
          discountPct: data.discount_value,
          durationMonths: data.duration_months ?? null,
          appliesTo: data.applies_to,
          badge,
        },
      });
    } catch {
      setPromo({
        status: "error",
        code: trimmed,
        error: "Couldn't reach validation server. Try again.",
      });
    }
  };

  const clearPromo = () => {
    setPromo({ status: "idle" });
    setCode("");
  };

  const activePromo = promo.status === "valid" ? promo.promo : null;

  return (
    <section className="mt-10 sm:mt-12">
      <CadenceToggle cadence={cadence} onChange={setCadence} />

      <div className="mt-10 grid gap-6 sm:mt-14 lg:grid-cols-2 lg:gap-8">
        <TierCard
          tier="standard"
          title="Aven Standard"
          subtitle="For active Bitcoin traders"
          cadence={cadence}
          promo={activePromo}
          features={STANDARD_FEATURES}
        />
        <TierCard
          tier="vip"
          title="Aven VIP"
          subtitle="For traders who want it all"
          cadence={cadence}
          promo={activePromo}
          features={null}
          vipExtras={VIP_EXTRAS}
          recommended
        />
      </div>

      {/* Round-33: promo input back under the cards. Toggle + cards
          are the two things visitors compare side-by-side; the code
          input is supporting copy that follows. */}
      <PromoInput
        code={code}
        setCode={setCode}
        promo={promo}
        onApply={applyCode}
        onClear={clearPromo}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Cadence toggle.
// ---------------------------------------------------------------------------

function CadenceToggle({
  cadence,
  onChange,
}: {
  cadence: Cadence;
  onChange: (c: Cadence) => void;
}) {
  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Billing cadence"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1"
      >
        <CadenceOption
          active={cadence === "monthly"}
          onClick={() => onChange("monthly")}
        >
          Monthly
        </CadenceOption>
        <CadenceOption
          active={cadence === "yearly"}
          onClick={() => onChange("yearly")}
        >
          Yearly
          <span
            className={[
              "ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              cadence === "yearly"
                ? "bg-background/30 text-background"
                : "border border-emerald/30 bg-emerald/[0.08] text-emerald",
            ].join(" ")}
          >
            Save 17%
          </span>
        </CadenceOption>
      </div>
    </div>
  );
}

function CadenceOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-emerald text-background"
          : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Promo input — between toggle and cards.
// ---------------------------------------------------------------------------

function PromoInput({
  code,
  setCode,
  promo,
  onApply,
  onClear,
}: {
  code: string;
  setCode: (v: string) => void;
  promo: PromoState;
  onApply: () => void;
  onClear: () => void;
}) {
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void onApply();
  };

  const borderTone =
    promo.status === "valid"
      ? "border-emerald/45"
      : promo.status === "error"
        ? "border-red-500/45"
        : "border-border";

  return (
    <div className="mx-auto mt-7 w-full max-w-md text-center sm:mt-8">
      <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Have a discount code?
      </p>

      <form onSubmit={onSubmit} className="mt-3">
        <div
          className={`flex items-stretch gap-2 rounded-full border ${borderTone} bg-surface p-1 transition-colors`}
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            aria-label="Discount code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={
              promo.status === "validating" || promo.status === "valid"
            }
            className="flex-1 rounded-full bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-70"
          />
          {promo.status === "valid" ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald/[0.08] px-3 py-1.5 text-sm font-medium text-emerald transition-colors hover:bg-emerald/[0.14]"
            >
              <IconX size={12} stroke={2.25} aria-hidden />
              Remove
            </button>
          ) : (
            <button
              type="submit"
              disabled={
                !code.trim() || promo.status === "validating"
              }
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-emerald px-4 py-1.5 text-sm font-semibold text-background transition-colors hover:bg-emerald-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {promo.status === "validating" ? (
                <>
                  <IconLoader2
                    size={13}
                    stroke={2.25}
                    className="animate-spin"
                    aria-hidden
                  />
                  Checking…
                </>
              ) : (
                "Apply"
              )}
            </button>
          )}
        </div>
      </form>

      {promo.status === "valid" && (
        <p className="mt-2.5 inline-flex items-center gap-1.5 text-sm text-emerald">
          <IconCheck size={14} stroke={2.5} aria-hidden />
          <span>
            Code <span className="font-mono">{promo.promo.code}</span>{" "}
            applied — {promo.promo.badge}
          </span>
        </p>
      )}

      {promo.status === "error" && (
        <p role="alert" className="mt-2.5 text-sm text-red-300">
          {promo.error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier card with live-price update logic.
// ---------------------------------------------------------------------------

function TierCard({
  tier,
  title,
  subtitle,
  cadence,
  promo,
  features,
  vipExtras,
  recommended = false,
}: {
  tier: TierId;
  title: string;
  subtitle: string;
  cadence: Cadence;
  promo: ValidPromo | null;
  // Standard passes its 6 bullets; VIP passes `null` and shows only
  // the "Everything in Standard, plus" prefix + its extras.
  features: ReadonlyArray<FeatureItem> | null;
  vipExtras?: ReadonlyArray<FeatureItem>;
  recommended?: boolean;
}) {
  const basePrice = PRICES[tier][cadence];

  const applies =
    promo !== null &&
    (promo.appliesTo === tier || promo.appliesTo === "both");

  const discountedPrice = applies
    ? roundCents(basePrice * (1 - promo!.discountPct / 100))
    : null;

  const monthlyEquivalent =
    cadence === "yearly"
      ? (discountedPrice ?? basePrice) / 12
      : null;

  // Hint shown when a code is active but doesn't apply to THIS tier.
  const exclusionHint =
    promo !== null && !applies
      ? `Code applies to ${otherTierLabel(promo.appliesTo)} only.`
      : null;

  const ctaLabel = applies
    ? `Start free trial — ${promo!.discountPct}% off`
    : "Start free trial";

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const startCheckout = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/proxy/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          // Backend contract: `interval` must be exactly the strings
          // "monthly" or "yearly" (lowercase, no trim). `cadence` is
          // already typed as that exact union — pass it straight
          // through. The fallback `?? "monthly"` is defensive in
          // case the union ever widens to allow undefined.
          interval: cadence ?? "monthly",
          ...(applies && promo ? { code: promo.code } : {}),
        }),
      });

      // Backend not wired yet → fall back to /onboard so the rest of
      // the frontend flow stays testable end-to-end.
      if (res.status === 404 || res.status === 501) {
        window.location.assign("/onboard");
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        checkout_url?: string;
        url?: string;
        error?: string;
      } | null;

      const url = data?.checkout_url ?? data?.url;
      if (!res.ok || !url) {
        setSubmitError(data?.error ?? "Couldn't start checkout. Try again.");
        return;
      }
      window.location.assign(url);
    } catch {
      setSubmitError("Connection issue. Try again.");
    } finally {
      // Stays disabled while the redirect runs; only resets on error.
      setSubmitting(false);
    }
  };

  return (
    <div
      className={[
        "relative flex flex-col rounded-2xl border bg-surface p-7 sm:p-8",
        recommended
          ? "border-emerald/40 shadow-[0_0_80px_-20px_rgba(16,185,129,0.45),0_8px_36px_-12px_rgba(0,0,0,0.5)]"
          : "border-border",
      ].join(" ")}
    >
      {recommended && (
        <span className="absolute right-6 top-6 inline-flex items-center rounded-full border border-emerald/30 bg-emerald/[0.10] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald">
          Most popular
        </span>
      )}

      <header>
        <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
      </header>

      {applies && (
        <span className="mt-5 inline-flex items-center gap-1.5 self-start rounded-full border border-emerald/30 bg-emerald/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald">
          <IconTicket size={11} stroke={2} aria-hidden />
          {promo!.badge}
        </span>
      )}

      <PriceBlock
        basePrice={basePrice}
        discountedPrice={discountedPrice}
        cadence={cadence}
        monthlyEquivalent={monthlyEquivalent}
      />

      {exclusionHint && (
        <p className="mt-2 text-[12px] text-muted-foreground/80">
          {exclusionHint}
        </p>
      )}

      {/* CTA tone differs by tier — Standard reads as the secondary
          option (neutral border + foreground), VIP as the primary
          conversion (emerald fill). The recommended-card emerald
          glow on the outside + emerald button on the inside reads
          as "pick this". Click POSTs to the Stripe-checkout proxy
          and redirects to the returned checkout_url; per-card
          loading state prevents double-submits while the redirect
          spins up. */}
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={submitting}
        aria-busy={submitting}
        className={[
          "mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-70",
          recommended
            ? "bg-emerald text-background hover:bg-emerald-hover"
            : "border border-border bg-background text-foreground hover:border-foreground/30 hover:bg-surface-elevated",
        ].join(" ")}
      >
        {submitting ? (
          <>
            <IconLoader2
              size={14}
              stroke={2.25}
              className="animate-spin"
              aria-hidden
            />
            Starting checkout…
          </>
        ) : (
          ctaLabel
        )}
      </button>

      {submitError ? (
        <p
          role="alert"
          className="mt-3 text-center text-[11px] text-red-300"
        >
          {submitError}
        </p>
      ) : (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          14-day free trial · cancel anytime
        </p>
      )}

      <ul className="mt-8 space-y-3.5 border-t border-border pt-7">
        {features?.map((f) => (
          <FeatureRow key={f.label} Icon={f.Icon} label={f.label} />
        ))}
        {vipExtras && (
          <>
            <li
              className={[
                "font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald/85",
                features ? "pt-3" : "",
              ].join(" ")}
            >
              Everything in Standard, plus:
            </li>
            {vipExtras.map((x) => (
              <FeatureRow key={x.label} Icon={x.Icon} label={x.label} />
            ))}
          </>
        )}
      </ul>
    </div>
  );
}

function FeatureRow({ Icon, label }: { Icon: TablerIcon; label: string }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald/[0.08] text-emerald ring-1 ring-emerald/15"
        aria-hidden
      >
        <Icon size={14} stroke={1.75} />
      </span>
      <span className="text-[14px] leading-relaxed text-foreground/90">
        {label}
      </span>
    </li>
  );
}

function PriceBlock({
  basePrice,
  discountedPrice,
  cadence,
  monthlyEquivalent,
}: {
  basePrice: number;
  discountedPrice: number | null;
  cadence: Cadence;
  monthlyEquivalent: number | null;
}) {
  const cadenceLabel = cadence === "monthly" ? "/ month" : "/ year";

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {discountedPrice !== null ? (
          <>
            <span className="font-mono text-4xl font-semibold tracking-tight text-emerald sm:text-5xl">
              {formatPrice(discountedPrice, hasCents(discountedPrice) ? 2 : 0)}
            </span>
            <span
              aria-label="Original price"
              className="font-mono text-lg text-muted-foreground line-through"
            >
              was {formatPrice(basePrice)}
            </span>
          </>
        ) : (
          <span className="font-mono text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {formatPrice(basePrice)}
          </span>
        )}
        <span className="text-sm text-muted-foreground">{cadenceLabel}</span>
      </div>
      {monthlyEquivalent !== null && (
        <p className="mt-1 font-mono text-[12px] text-muted-foreground">
          ≈ {formatPrice(monthlyEquivalent, 2)} / month
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

function formatPrice(v: number, fractionDigits = 0): string {
  return `$${v.toLocaleString("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}

function hasCents(v: number): boolean {
  return Math.round(v * 100) % 100 !== 0;
}

function roundCents(v: number): number {
  return Math.round(v * 100) / 100;
}

function otherTierLabel(appliesTo: AppliesTo): string {
  // appliesTo === "both" never lands here (every tier applies).
  return appliesTo === "standard"
    ? TIER_LABEL.standard
    : TIER_LABEL.vip;
}

