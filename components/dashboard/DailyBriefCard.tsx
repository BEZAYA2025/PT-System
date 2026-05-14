"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { AvenAvatar } from "./AvenAvatar";
import type { DailyBrief } from "@/lib/mock-dashboard";

function timeAgo(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  } catch {
    return "";
  }
}

export function DailyBriefCard({ brief }: { brief: DailyBrief | null }) {
  const [expanded, setExpanded] = useState(false);

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
    <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <AvenAvatar size={36} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Today&apos;s Brief
            </h2>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              Aven&apos;s market take · {timeAgo(brief.generatedAt)}
            </p>
          </div>

          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {expanded ? brief.body : brief.summary}
          </p>

          {brief.body !== brief.summary && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald transition-colors hover:text-emerald-hover"
            >
              {expanded ? "Show less" : "Read full brief"}
              <IconChevronDown
                size={14}
                stroke={2}
                className={[
                  "transition-transform",
                  expanded ? "rotate-180" : "",
                ].join(" ")}
              />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
