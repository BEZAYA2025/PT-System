"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

interface QA {
  q: string;
  a: string;
}

const FAQ: ReadonlyArray<QA> = [
  {
    q: "What happens after the 14-day trial?",
    a: "After 14 days, you'll be charged your selected plan automatically. You can cancel anytime from your dashboard before the trial ends — no charge.",
  },
  {
    q: "Can I switch between Standard and VIP?",
    a: "Yes. Upgrade or downgrade anytime from your dashboard. Changes take effect at the next billing cycle.",
  },
  {
    q: "Which exchanges do you support?",
    a: "Binance, Bybit, OKX, Bitget, Kucoin, MEXC, Gate.io, Bitunix, and Hyperliquid. PT System uses read-only API keys — your funds stay on your exchange.",
  },
  {
    q: "What's the difference between Standard and VIP?",
    a: "Standard gives you everything you need to trade with Aven daily. VIP unlocks unlimited Aven chat, deeper reasoning, full setup-scanner access, priority response times, and exclusive on-chain data.",
  },
  {
    q: "Is this financial advice?",
    a: "No. PT System is educational content and a mentorship tool. We do not provide financial, investment, or trading advice. Trading futures involves substantial risk.",
  },
  {
    q: "How do I cancel?",
    a: "Cancel anytime from your dashboard settings. No questions asked, no retention emails.",
  },
];

export function PricingFaq() {
  return (
    <section className="mx-auto mt-24 w-full max-w-3xl sm:mt-32">
      <h2 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Frequently Asked Questions
      </h2>
      <ul className="mt-8 space-y-2 sm:mt-10">
        {FAQ.map((item) => (
          <FaqItem key={item.q} question={item.q} answer={item.a} />
        ))}
      </ul>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-xl border border-border bg-surface/70 transition-colors hover:bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[15px] font-medium text-foreground sm:text-base">
          {question}
        </span>
        <IconChevronDown
          size={16}
          stroke={1.75}
          aria-hidden
          className={`shrink-0 text-muted-foreground transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="border-t border-border px-5 py-4 text-sm leading-relaxed text-foreground/85 sm:text-[15px]">
          {answer}
        </div>
      )}
    </li>
  );
}
