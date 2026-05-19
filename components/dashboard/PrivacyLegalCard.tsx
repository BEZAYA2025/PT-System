"use client";

import { useState } from "react";
import {
  IconCookie,
  IconFileDescription,
  IconGavel,
  IconReceiptRefund,
  IconScale,
  IconShieldLock,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { cardClasses } from "@/lib/ui";
import { SettingsCardHeader } from "./SettingsCardHeader";

// Round-26 legal-surfaces card. Five documents the platform needs in
// place before launch: Privacy Policy, Terms of Service, Cookie
// Policy, Refund Policy, and Contact. Each opens in a modal with
// placeholder / boilerplate text — final wording will come from
// counsel before beta launch, but the structure, company details
// (Fortex Media Ltd.), and the NOT FINANCIAL ADVICE disclaimer stand
// today so the UX architecture reads professional.
//
// hello@fortex-media.com appears only inside the Contact body —
// it's the registered company contact and is reserved for legal /
// company correspondence. Member-facing support goes via
// hello@ptsystem.ai (HelpSupportCard).

type DocKey =
  | "privacy"
  | "terms"
  | "cookies"
  | "refund"
  | "contact";

interface DocItem {
  key: DocKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const ITEMS: ReadonlyArray<DocItem> = [
  {
    key: "privacy",
    title: "Privacy Policy",
    subtitle: "What we collect, why, and your rights under UK GDPR.",
    icon: <IconShieldLock size={16} stroke={1.75} aria-hidden />,
  },
  {
    key: "terms",
    title: "Terms of Service",
    subtitle: "Subscription terms · educational platform · NOT financial advice.",
    icon: <IconFileDescription size={16} stroke={1.75} aria-hidden />,
  },
  {
    key: "cookies",
    title: "Cookie Policy",
    subtitle: "Session, preference, and analytics cookies.",
    icon: <IconCookie size={16} stroke={1.75} aria-hidden />,
  },
  {
    key: "refund",
    title: "Refund Policy",
    subtitle: "Cancel anytime · access until end of billing period.",
    icon: <IconReceiptRefund size={16} stroke={1.75} aria-hidden />,
  },
  {
    key: "contact",
    title: "Contact",
    subtitle: "Fortex Media Ltd. · 71-75 Shelton Street, London.",
    icon: <IconGavel size={16} stroke={1.75} aria-hidden />,
  },
];

export function PrivacyLegalCard() {
  const [open, setOpen] = useState<DocKey | null>(null);

  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Privacy · Legal"
        title="Privacy & legal"
        description="The legal documents governing your use of PT System. Tap to read."
        icon={<IconScale size={18} stroke={1.75} aria-hidden />}
      />

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => setOpen(item.key)}
              className="flex w-full items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-emerald/40 hover:bg-emerald/[0.04]"
            >
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald/[0.08] text-emerald">
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {item.title}
                  </span>
                  <span
                    aria-hidden
                    className="font-mono text-[10px] uppercase tracking-wider text-emerald/80"
                  >
                    Read →
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {item.subtitle}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        size="lg"
        title={
          <span className="flex items-center gap-2">
            {open && ITEMS.find((i) => i.key === open)?.icon}
            <span>{open ? ITEMS.find((i) => i.key === open)?.title : ""}</span>
          </span>
        }
        description={LAST_UPDATED}
      >
        {open === "privacy" && <PrivacyPolicyBody />}
        {open === "terms" && <TermsBody />}
        {open === "cookies" && <CookiePolicyBody />}
        {open === "refund" && <RefundPolicyBody />}
        {open === "contact" && <ContactBody />}
      </Modal>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Document bodies — boilerplate / placeholder content. Counsel will
// rewrite for the beta launch; structure and entity references stand.
// ---------------------------------------------------------------------------

const LAST_UPDATED = "Last updated: 18 May 2026 · Subject to revision before beta launch";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-300/80">
        {title}
      </h3>
      <div className="text-sm leading-relaxed text-foreground/85 [&_p]:mt-2 [&_p:first-child]:mt-0 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function CalloutImportant({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm leading-relaxed text-amber-100">
      {children}
    </p>
  );
}

function PrivacyPolicyBody() {
  return (
    <div className="space-y-5">
      <Section title="Data Controller">
        <p>
          PT System is operated by <strong>Fortex Media Ltd.</strong>, a UK
          limited company registered in England and Wales, with its
          registered office at 71-75 Shelton Street, London, WC2H 9JQ,
          United Kingdom. Fortex Media Ltd. is the data controller for
          all personal data processed via PT System.
        </p>
      </Section>

      <Section title="Legal Framework">
        <p>
          Your data is handled in accordance with the{" "}
          <strong>UK Data Protection Act 2018</strong> and the{" "}
          <strong>EU General Data Protection Regulation (GDPR)</strong>.
          For UK residents, the UK GDPR applies; for EU residents, the
          EU GDPR applies in parallel.
        </p>
      </Section>

      <Section title="What we collect">
        <ul>
          <li>
            Account details (email, display name, authentication tokens).
          </li>
          <li>
            Subscription and billing metadata (processed by Stripe; we
            store the customer ID and invoice references, not card data).
          </li>
          <li>
            Exchange API keys (read-only) that you voluntarily connect.
            Encrypted at rest; never transmitted in plaintext.
          </li>
          <li>
            Trade history, briefing read-state, and Aven conversation
            transcripts.
          </li>
          <li>
            Operational logs (IP, user agent, page paths) for security
            and incident response.
          </li>
        </ul>
      </Section>

      <Section title="Your rights">
        <p>
          You have the right to access, correct, export, restrict, or
          delete your personal data; to object to processing; and to
          lodge a complaint with the UK Information Commissioner&apos;s
          Office (ICO) or your local supervisory authority. Exercise
          these rights via Settings → Privacy & Data or by emailing the
          support team.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Account data is retained while your subscription is active and
          for 24 months after cancellation, after which it is
          irreversibly anonymised. Billing records are retained for the
          statutory minimum (7 years under UK accounting rules).
        </p>
      </Section>

      <CalloutImportant>
        This is a placeholder draft. The final Privacy Policy will be
        reviewed by counsel before beta launch.
      </CalloutImportant>
    </div>
  );
}

function TermsBody() {
  return (
    <div className="space-y-5">
      <Section title="Agreement">
        <p>
          These Terms govern your use of PT System, a product of{" "}
          <strong>Fortex Media Ltd.</strong> (the &ldquo;Company&rdquo;). By signing
          up you accept these Terms. The Company may revise them with
          notice; continued use after revision constitutes acceptance.
        </p>
      </Section>

      <Section title="Subscription">
        <p>
          PT System is offered on a paid monthly subscription. Pricing
          and tier features are shown at signup. Subscriptions renew
          automatically at the end of each billing period unless
          cancelled. You may cancel at any time from Settings →
          Subscription; access continues until the end of the paid
          period and no future charges occur.
        </p>
      </Section>

      <CalloutImportant>
        <strong>NOT FINANCIAL ADVICE.</strong> PT System is an
        educational platform. Aven, the daily briefings, trade alerts,
        and all content surfaced through the product share Paul&apos;s
        analysis and methodology — they are not personal financial,
        investment, or trading advice, and they do not account for your
        individual financial situation, risk tolerance, or objectives.
        Trading carries significant risk including possible total loss
        of capital. You are solely responsible for your own trading
        decisions and outcomes.
      </CalloutImportant>

      <Section title="Acceptable Use">
        <ul>
          <li>
            One account per member. No sharing of credentials or
            redistributing premium content.
          </li>
          <li>
            No reverse engineering, scraping, or automated harvesting of
            content beyond your own account.
          </li>
          <li>
            Read-only exchange keys only — never share withdrawal-
            capable keys with any third party, including us.
          </li>
        </ul>
      </Section>

      <Section title="Termination">
        <p>
          The Company may suspend or terminate access for breach of
          these Terms, fraudulent payment, or repeated abuse of platform
          resources. Members terminate by cancelling their subscription.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the maximum extent permitted by law, the Company&apos;s
          aggregate liability is limited to the amount you paid in
          subscription fees in the 12 months preceding the claim. The
          Company is not liable for trading losses, missed
          opportunities, or third-party platform outages.
        </p>
      </Section>

      <Section title="Governing Law">
        <p>
          These Terms are governed by the laws of England and Wales.
          Disputes are subject to the exclusive jurisdiction of the
          courts of England and Wales.
        </p>
      </Section>

      <CalloutImportant>
        Placeholder draft. Counsel will revise before beta launch.
      </CalloutImportant>
    </div>
  );
}

function CookiePolicyBody() {
  return (
    <div className="space-y-5">
      <Section title="Categories of cookies we use">
        <ul>
          <li>
            <strong>Strictly necessary</strong> — session and
            authentication cookies. The platform cannot function without
            them. No consent required.
          </li>
          <li>
            <strong>Preference</strong> — remember small UI choices
            (e.g. accordion state, opt-in to reduced motion).
          </li>
          <li>
            <strong>Analytics</strong> — aggregated usage telemetry
            (page views, feature uptake). Used only to improve the
            product. Anonymised within 30 days.
          </li>
        </ul>
      </Section>

      <Section title="No third-party advertising">
        <p>
          PT System does not run advertising and does not sell or
          share data with ad networks. The third parties we use are
          limited to: Stripe (payments), and our own backend
          infrastructure providers.
        </p>
      </Section>

      <Section title="Managing cookies">
        <p>
          You can clear cookies via your browser settings at any time.
          Doing so will sign you out of the platform.
        </p>
      </Section>

      <CalloutImportant>
        Placeholder draft. Final cookie list will be enumerated before
        beta launch.
      </CalloutImportant>
    </div>
  );
}

function RefundPolicyBody() {
  return (
    <div className="space-y-5">
      <Section title="Subscription billing">
        <p>
          All subscriptions are billed monthly in advance. You can
          cancel at any time from Settings → Subscription. Your
          subscription remains active until the end of the current
          billing period, after which no further charges occur.
        </p>
      </Section>

      <Section title="No partial refunds">
        <p>
          We do not pro-rate refunds for unused days within a billing
          period. If you cancel mid-period, you keep full access until
          the period ends and are not charged again.
        </p>
      </Section>

      <Section title="Exceptional cases">
        <p>
          If you were charged in error or unable to access the service
          due to a verified outage on our side, contact support and we
          will review on a case-by-case basis. UK / EU statutory rights
          are not affected.
        </p>
      </Section>

      <CalloutImportant>
        Placeholder draft. Counsel will revise before beta launch.
      </CalloutImportant>
    </div>
  );
}

function ContactBody() {
  return (
    <div className="space-y-5">
      <Section title="Company details">
        <p>
          <strong>Fortex Media Ltd.</strong>
          <br />
          71-75 Shelton Street
          <br />
          London, WC2H 9JQ
          <br />
          United Kingdom
        </p>
      </Section>

      <Section title="Registration">
        <p>
          Registered in England and Wales as a UK limited company.
          Registered with Companies House.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Company correspondence: <code>hello@fortex-media.com</code>
          <br />
          Web: <code>fortex-media.com</code>
        </p>
        <p className="text-xs text-muted-foreground">
          For member support, billing questions, or anything PT System
          related, use the support address in Help & Support — that
          inbox is monitored by the product team. The Fortex address is
          for legal and company correspondence only.
        </p>
      </Section>

      <Section title="Product">
        <p>
          PT System is a product of Fortex Media Ltd. The platform,
          including Aven, the daily briefings, and the trade tracking
          surfaces, is operated by the Company.
        </p>
      </Section>
    </div>
  );
}
