"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type {
  BiasTone,
  BriefingTimeframe,
  ParsedBriefing,
} from "@/lib/briefing-parser";

const BIAS_PILL: Record<BiasTone, { className: string; label: string }> = {
  bullish: {
    className:
      "border-emerald-500/30 bg-emerald-500/[0.10] text-emerald-300",
    label: "Bullish",
  },
  bearish: {
    className: "border-rose-500/30 bg-rose-500/[0.10] text-rose-300",
    label: "Bearish",
  },
  mixed: {
    className: "border-amber-500/30 bg-amber-500/[0.10] text-amber-300",
    label: "Mixed",
  },
  neutral: {
    className: "border-border bg-surface text-muted-foreground",
    label: "Neutral",
  },
};

// Wrap price- and percentage-shaped substrings in a monospace font so
// trader-readable numbers visually pop out of the prose. Matches:
//   $76.812 / $76,812.50 / 1.5% / 5% / 76.812 / 0.618 / 1,5%
function FormattedText({ text }: { text: string }) {
  const NUM_RE =
    /(\$\s?[\d.,]+(?:\.\d+)?|\d+[.,]\d+(?:[.,]\d+)?%?|\d+\s?%)/g;
  const parts: { type: "text" | "mono"; value: string }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_RE.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: "text", value: text.slice(last, m.index) });
    }
    parts.push({ type: "mono", value: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return (
    <>
      {parts.map((p, i) =>
        p.type === "mono" ? (
          <span
            key={i}
            className="font-mono text-[0.92em] tracking-tight text-foreground"
          >
            {p.value}
          </span>
        ) : (
          <span key={i}>{p.value}</span>
        ),
      )}
    </>
  );
}

function ProseText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <p
      className={`whitespace-pre-line text-[14px] leading-relaxed text-foreground/90 ${className}`}
    >
      <FormattedText text={text} />
    </p>
  );
}

function TimeframeAccordion({
  tf,
  defaultOpen,
}: {
  tf: BriefingTimeframe;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bias = BIAS_PILL[tf.bias];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface/60"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="text-base leading-none" aria-hidden>
            {tf.emoji}
          </span>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
            {tf.name}
          </span>
          {tf.biasText && (
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${bias.className}`}
            >
              {bias.label}
            </span>
          )}
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
        <div className="space-y-4 border-t border-border px-4 py-4">
          {tf.items.map((item) => (
            <div
              key={item.label}
              className="border-l-2 border-emerald-500/25 pl-3.5 sm:pl-4"
            >
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                {item.label}
              </p>
              <div className="mt-1.5">
                <ProseText text={item.body} />
              </div>
            </div>
          ))}
          {tf.items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No details parsed for this timeframe.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

export function BriefingFullView({ parsed }: { parsed: ParsedBriefing }) {
  return (
    <div className="space-y-5">
      {parsed.header && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          {parsed.header.asset && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-200">
              {parsed.header.asset}
            </span>
          )}
          {parsed.header.date && (
            <span className="font-mono text-[11px] text-muted-foreground">
              {parsed.header.date}
            </span>
          )}
          {parsed.header.spot && (
            <span className="font-mono text-[11px] text-muted-foreground">
              · Spot{" "}
              <span className="text-foreground">${parsed.header.spot}</span>
            </span>
          )}
        </div>
      )}

      {parsed.setup && (
        <section className="rounded-xl border border-emerald-500/25 bg-gradient-to-br from-surface via-surface to-emerald-500/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-base leading-none" aria-hidden>
              {parsed.setup.emoji}
            </span>
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
              {parsed.setup.title || "Gesamtbild & Setup"}
            </h3>
          </div>

          {parsed.setup.preamble && (
            <div className="mb-4">
              <ProseText
                text={parsed.setup.preamble}
                className="text-[14.5px] text-foreground"
              />
            </div>
          )}

          {parsed.setup.items.length > 0 ? (
            <div className="space-y-4">
              {parsed.setup.items.map((item) => (
                <div
                  key={item.label}
                  className="border-l-2 border-foreground/15 pl-3.5 sm:pl-4"
                >
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
                    {item.label}
                  </p>
                  <div className="mt-1.5">
                    <ProseText
                      text={item.body}
                      className="text-[14.5px] text-foreground"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !parsed.setup.preamble && (
              <ProseText
                text={parsed.setup.body}
                className="text-[14.5px] text-foreground"
              />
            )
          )}
        </section>
      )}

      {parsed.timeframes.length > 0 && (
        <div className="space-y-3">
          {parsed.timeframes.map((tf, i) => (
            <TimeframeAccordion
              key={`${tf.name}-${i}`}
              tf={tf}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
