"use client";

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import {
  IconArrowRight,
  IconBook2,
  IconClockHour4,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { BriefAvatar } from "./BriefAvatar";
import { BriefingFullView } from "./BriefingFullView";
import { timeAgo } from "@/lib/format";
import type { DailyBriefView } from "@/lib/daily-brief";
import type { BiasTone } from "@/lib/briefing-parser";

const BIAS_QUOTE: Record<BiasTone, string> = {
  bullish: "border-emerald-500/40 bg-emerald-500/[0.04]",
  bearish: "border-rose-500/40 bg-rose-500/[0.04]",
  mixed: "border-amber-500/40 bg-amber-500/[0.04]",
  neutral: "border-border bg-surface/40",
};

function AssetPill({ asset }: { asset: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/[0.08] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-amber-200">
      {asset}
    </span>
  );
}

function BriefHeading({ asset }: { asset: string | null }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {asset && <AssetPill asset={asset} />}
      <span>Morning Briefing</span>
    </span>
  );
}

function AuthorByline({ generatedAt }: { generatedAt: string }) {
  return (
    <span
      className="font-mono text-[11px] font-normal uppercase tracking-wider text-muted-foreground"
      suppressHydrationWarning
    >
      created by Aven · {timeAgo(generatedAt)}
    </span>
  );
}

export function DailyBriefCard({
  brief,
  isFounder = false,
}: {
  brief: DailyBriefView | null;
  isFounder?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!brief) {
    // Founders see a route into /admin/briefings — for them, "no
    // briefing yet" usually means there's a pending one waiting on
    // their own approval, not an Aven generation gap.
    if (isFounder) {
      return (
        <section className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <BriefAvatar size={36} />
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                No briefing approved yet
              </h2>
              <Link
                href="/admin/briefings"
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/[0.08] px-3 py-1.5 text-sm font-medium text-amber-200 transition-colors hover:border-amber-500/55 hover:bg-amber-500/[0.14]"
              >
                Review pending briefings
                <IconArrowRight size={13} stroke={2} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <BriefAvatar size={36} />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Your first briefing arrives tomorrow at 7 AM
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Aven analyzes Bitcoin across five timeframes — Daily, 4H,
              1H, 30m, 15m — and delivers a 2-minute read so you know
              what to expect today. Look for it in your morning
              routine.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const parsed = brief.parsed;
  const asset = parsed?.header?.asset ?? null;
  const bias = parsed?.primaryBias ?? null;
  const setup = parsed?.setup ?? null;

  const openModal = () => setOpen(true);
  const onCardKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openModal();
    }
  };

  return (
    <>
      <section
        role="button"
        tabIndex={0}
        aria-label="Open today's briefing"
        onClick={openModal}
        onKeyDown={onCardKey}
        className="group cursor-pointer rounded-2xl border border-amber-500/15 bg-gradient-to-br from-surface via-surface to-amber-500/[0.03] p-6 transition-colors hover:border-amber-500/30 hover:to-amber-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 sm:p-8"
      >
        <div className="flex items-start gap-4">
          <BriefAvatar size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                <BriefHeading asset={asset} />
              </h2>
              <AuthorByline generatedAt={brief.generatedAt} />
            </div>

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

            {setup && (setup.items.length > 0 || setup.body) && (
              <div className="mt-5">
                <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
                  🎯 {setup.title || "Overall Picture & Setup"}
                </p>
                {setup.items.length > 0 ? (
                  <div className="mt-2 space-y-3">
                    {setup.items.map((item) => (
                      <div
                        key={item.label}
                        className="border-l-2 border-emerald-500/25 pl-3"
                      >
                        <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-emerald-300/70">
                          {item.label}
                        </p>
                        <p className="mt-1 line-clamp-2 whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
                          {item.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
                    {setup.body}
                  </p>
                )}
              </div>
            )}

            {!parsed && (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
                {brief.summary}
              </p>
            )}

            {/* Visual affordance — the whole section is the click
                target (role=button + onClick on <section>), this is
                styled like a button so members get a clear "click
                this" cue. The actual hover state is driven by the
                parent section's `group` class so hovering anywhere
                on the card lights up this button too. */}
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-md border border-emerald/30 bg-emerald/[0.10] px-3 py-1.5 text-sm font-medium text-emerald transition-colors group-hover:border-emerald/55 group-hover:bg-emerald/[0.16]">
              <IconBook2 size={14} stroke={1.75} aria-hidden />
              Read full brief
            </span>
          </div>
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <BriefHeading asset={asset} />
            <AuthorByline generatedAt={brief.generatedAt} />
          </span>
        }
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
