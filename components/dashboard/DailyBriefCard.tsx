"use client";

import { useState } from "react";
import { IconBook2, IconClockHour4 } from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { AvenAvatar } from "./AvenAvatar";
import { timeAgo } from "@/lib/format";
import type { DailyBriefView } from "@/lib/daily-brief";

export function DailyBriefCard({ brief }: { brief: DailyBriefView | null }) {
  const [open, setOpen] = useState(false);

  if (!brief) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AvenAvatar size={36} />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Today&apos;s Brief
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aven is preparing today&apos;s brief…
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <AvenAvatar size={36} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Today&apos;s Brief
              </h2>
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Aven · {timeAgo(brief.generatedAt)}
              </p>
            </div>

            {brief.isStale && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-amber-200">
                <IconClockHour4 size={11} stroke={1.75} aria-hidden />
                Yesterday&apos;s brief
              </p>
            )}

            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
              {brief.summary}
            </p>

            {brief.fullContent !== brief.summary && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald transition-colors hover:text-emerald-hover"
              >
                <IconBook2 size={14} stroke={1.75} />
                Read full brief
              </button>
            )}
          </div>
        </div>
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Today's Brief"
        description={`Aven · ${timeAgo(brief.generatedAt)}`}
        size="lg"
      >
        <div className="max-h-[60vh] overflow-y-auto">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {brief.fullContent}
          </p>
        </div>
      </Modal>
    </>
  );
}
