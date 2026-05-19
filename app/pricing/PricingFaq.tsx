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
    a: "After 14 days, you'll be charged your selected plan automatically. Cancel anytime from your dashboard before the trial ends — no charge.",
  },
  {
    q: "What's the difference between Standard and VIP?",
    a: "Standard focuses everything on Bitcoin — daily briefings, setup alerts, Aven analysis. VIP unlocks all major coins, unlimited Aven chat, Deep-Mode reasoning, personal coaching with weekly reviews, and advanced risk management. Both tiers show you Paul's full trade activity.",
  },
  {
    q: "How do I cancel?",
    a: "Anytime from your dashboard settings. No questions asked.",
  },
  {
    q: "Is this financial advice?",
    a: "No. PT System provides educational content and mentorship tools. It does not constitute financial, investment, or trading advice. Trading futures involves substantial risk.",
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
