"use client";

import { useState } from "react";
import { IconBook2, IconClockHour4 } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { BriefAvatar } from "./BriefAvatar";
import { BriefingFullView } from "./BriefingFullView";
import { timeAgo } from "@/lib/format";
import type { DailyBriefView } from "@/lib/daily-brief";
import type { BiasTone } from "@/lib/briefing-parser";

// Quote accent matches the bias tone so members get an at-a-glance read
// on the daily direction before they even read the words.
const BIAS_QUOTE: Record<BiasTone, string> = {
  bullish: "border-emerald-500/40 bg-emerald-500/[0.04]",
  bearish: "border-rose-500/40 bg-rose-500/[0.04]",
  mixed: "border-amber-500/40 bg-amber-500/[0.04]",
  neutral: "border-border bg-surface/40",
};

export function DailyBriefCard({ brief }: { brief: DailyBriefView | null }) {
  const [open, setOpen] = useState(false);

  if (!brief) {
    return (
      <section className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <BriefAvatar size={36} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-300/80">
              Today&apos;s Brief
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              Today&apos;s brief is being prepared…
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aven posts daily around 06:00 UTC.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const parsed = brief.parsed;
  const bias = parsed?.primaryBias ?? null;
  const setupTeaser = parsed?.setup?.body ?? null;

  return (
    <>
      <section className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <BriefAvatar size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-amber-300/80">
                  Today&apos;s Brief
                </p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
                  Morning briefing
                </h2>
              </div>
              <p
                className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground"
                suppressHydrationWarning
              >
                Aven · {timeAgo(brief.generatedAt)}
              </p>
            </div>

            {parsed?.header && (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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
                    <span className="text-foreground">
                      ${parsed.header.spot}
                    </span>
                  </span>
                )}
              </div>
            )}

            {brief.isStale && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-200">
                <IconClockHour4 size={11} stroke={1.75} aria-hidden />
                Yesterday&apos;s brief
              </p>
            )}

            {bias && (
              <figure
                className={`mt-4 rounded-xl border-l-2 px-4 py-3 ${
                  BIAS_QUOTE[bias.tone]
                }`}
              >
                <figcaption className="font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/60">
                  {bias.timeframe} · Bias
                </figcaption>
                <blockquote className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                  {bias.text}
                </blockquote>
              </figure>
            )}

            {setupTeaser && (
              <div className="mt-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-300/80">
                  🎯 Gesamtbild &amp; Setup
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
                  {setupTeaser}
                </p>
              </div>
            )}

            {!parsed && (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                {brief.summary}
              </p>
            )}

            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald transition-colors hover:text-emerald-hover"
            >
              <IconBook2 size={14} stroke={1.75} />
              Read full brief
            </button>
          </div>
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Today's Brief"
        description={modalDescription(brief)}
        size="lg"
      >
        {parsed ? (
          <BriefingFullView parsed={parsed} />
        ) : (
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {brief.fullContent}
          </p>
        )}
      </Modal>
    </>
  );
}

function modalDescription(brief: DailyBriefView): string {
  const h = brief.parsed?.header;
  const parts: string[] = [];
  if (h?.asset) parts.push(h.asset);
  if (h?.date) parts.push(h.date);
  if (h?.spot) parts.push(`Spot $${h.spot}`);
  if (parts.length === 0) return `Aven · ${timeAgo(brief.generatedAt)}`;
  return parts.join(" · ");
}
