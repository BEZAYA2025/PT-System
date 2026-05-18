"use client";

import { useState } from "react";
import {
  IconBook,
  IconChevronDown,
  IconExternalLink,
  IconHelpCircle,
  IconLifebuoy,
  IconMailbox,
  IconServer,
} from "@tabler/icons-react";
import { cardClasses } from "@/lib/ui";
import { SettingsCardHeader } from "./SettingsCardHeader";

// Round-26 help-and-support rewrite. Splits into four explicit member
// surfaces: contact email, inline FAQ (no separate page needed for
// stock questions), Getting-Started doc link, and the public status
// page. All member-facing email links route to hello@ptsystem.ai —
// the Fortex Media address is reserved for legal/company contact in
// the Impressum modal only.

const SUPPORT_EMAIL = "hello@ptsystem.ai";

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "How do I connect my Binance API?",
    a: "Open Settings → Exchange. Click 'Connect Binance', generate a read-only API key in your Binance account, paste the key and secret, and confirm. The key is encrypted server-side. PT System never has withdrawal access — read-only is all we ever ask for.",
  },
  {
    q: "How does the daily briefing work?",
    a: "Aven publishes a morning briefing every trading day around 06:00 UTC. It covers Daily / 4H / 1H / 30M / 15M structure, bias, key levels, and a single 'Overall Picture & Setup' summary at the end. The brief opens directly on your dashboard — Telegram only sends a short nudge so you don't have to switch context.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Settings → Subscription → Cancel subscription. Cancellation takes effect at the end of your current billing period — you keep full access until then. We don't pro-rate refunds, but you won't be charged again.",
  },
  {
    q: "What is the win-rate calculation based on?",
    a: "Win-rate = closed trades with positive realized PnL ÷ total closed trades, over your account history. Open positions don't count. Only trades that closed with a non-zero PnL are included; manual break-evens (PnL exactly zero) are excluded as neutral.",
  },
  {
    q: "Is this financial advice?",
    a: "No. PT System is an educational platform. Aven, the briefings, and the trade alerts share Paul's analysis and methodology — they aren't personal investment advice, and they don't account for your individual financial situation, risk tolerance, or goals. Trade your own decisions.",
  },
];

export function HelpSupportCard() {
  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Help · Support"
        title="Help & support"
        description="Reach the team, browse common questions, find docs, and check service status."
        icon={<IconLifebuoy size={18} stroke={1.75} aria-hidden />}
      />

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        <SupportTile
          href={`mailto:${SUPPORT_EMAIL}`}
          icon={<IconMailbox size={16} stroke={1.75} aria-hidden />}
          title="Get support"
          subtitle={SUPPORT_EMAIL}
          external
        />
        <SupportTile
          href="https://docs.ptsystem.ai/getting-started"
          icon={<IconBook size={16} stroke={1.75} aria-hidden />}
          title="Getting started"
          subtitle="Docs · onboarding walkthrough"
          external
        />
        <SupportTile
          href="https://status.ptsystem.ai"
          icon={<IconServer size={16} stroke={1.75} aria-hidden />}
          title="Status page"
          subtitle="Live system status & incident history"
          external
        />
        <FaqTile />
      </ul>

      <FaqInline />
    </section>
  );
}

function SupportTile({
  href,
  icon,
  title,
  subtitle,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-emerald/40 hover:bg-emerald/[0.04]"
      >
        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald/[0.08] text-emerald">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {title}
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        </span>
        {external && (
          <IconExternalLink
            size={12}
            stroke={1.75}
            className="mt-1 shrink-0 text-muted-foreground"
            aria-hidden
          />
        )}
      </a>
    </li>
  );
}

function FaqTile() {
  // The FAQ accordion lives under this tile — clicking it just scrolls
  // attention down. The tile is a non-link so the icon affordance
  // alone signals "expandable below".
  return (
    <li>
      <a
        href="#faq"
        onClick={(e) => {
          e.preventDefault();
          document
            .getElementById("faq")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }}
        className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-emerald/40 hover:bg-emerald/[0.04]"
      >
        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald/[0.08] text-emerald">
          <IconHelpCircle size={16} stroke={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            FAQ
          </span>
          <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
            Common questions · expand below
          </span>
        </span>
      </a>
    </li>
  );
}

function FaqInline() {
  return (
    <div id="faq" className="mt-6 border-t border-border pt-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Frequently asked
      </p>
      <ul className="mt-3 space-y-1.5">
        {FAQ.map((item) => (
          <FaqItem key={item.q} question={item.q} answer={item.a} />
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-lg border border-border bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface"
      >
        <span className="text-sm font-medium text-foreground">{question}</span>
        <IconChevronDown
          size={14}
          stroke={1.75}
          aria-hidden
          className={`shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3 text-sm leading-relaxed text-foreground/85">
          {answer}
        </div>
      )}
    </li>
  );
}
