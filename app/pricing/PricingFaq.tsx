"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

interface QA {
  q: string;
  a: string;
}

// Round-39 FAQ — re-ordered to follow the funnel: cost → security →
// coverage → exit → legal. The Standard-vs-VIP question was dropped
// (already on the cards directly above); two new entries replace it
// to address the two questions members actually ask before
// connecting an exchange API key.
const FAQ: ReadonlyArray<QA> = [
  {
    q: "Do I need to pay anything to start the trial?",
    a: "No. Start your 14-day free trial with no payment details. If you decide to continue after the trial, you'll add payment then. If not, access simply ends — no surprise charges.",
  },
  {
    q: "Is my exchange account safe?",
    a: "Yes. PT System connects to your exchange via read-only API keys. We can see your trade data but cannot move funds, place trades, or withdraw. Your funds always stay on your exchange.",
  },
  {
    q: "Which coins does PT System analyze?",
    a: "Standard focuses on Bitcoin. VIP covers all major coins (BTC, ETH, SOL, and other top altcoins). Paul's full trade activity — across all coins — is visible in both tiers.",
  },
  {
    q: "How do I cancel?",
    a: "Anytime from your dashboard settings. No retention process, no questions asked.",
  },
  {
    q: "Is this financial advice?",
    a: "No. PT System provides educational content and mentorship tools only. It does not constitute financial, investment, or trading advice. Trading cryptocurrency futures involves substantial risk.",
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
