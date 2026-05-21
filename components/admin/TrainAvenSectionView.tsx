"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBook2,
  IconBrandHipchat,
  IconCheck,
  IconChevronDown,
  IconLayoutDashboard,
  IconMessage2,
  IconMicrophone,
  IconShieldCheck,
} from "@tabler/icons-react";
// TrainAvenSparringTab kept on disk until Paul verifies the new
// TrainStudio in production; not imported here so it doesn't ship
// to the bundle. Will be deleted after verification.
import { TrainStudio } from "./train-aven/TrainStudio";
import { TrainAvenCurriculumTab } from "./train-aven/TrainAvenCurriculumTab";
import { TrainAvenFeedbackTab } from "./train-aven/TrainAvenFeedbackTab";
import { TrainAvenSystemTab } from "./train-aven/TrainAvenSystemTab";
import { AvenVoiceNotesTab } from "./AvenVoiceNotesTab";
import { AvenVkbTab } from "./AvenVkbTab";

type TabKey =
  | "sparring"
  | "curriculum"
  | "voice-notes"
  | "vkb"
  | "feedback"
  | "system";

// Iteration 3: the always-on 6-glyph icon strip pulled attention off
// the chat. Replaced with a single discreet "View ▾" trigger that
// opens a small popover menu — the adjacent surfaces (curriculum,
// voice notes, VKB, feedback, system) stay one click away but no
// longer compete with the chatbox for attention.
const TABS: ReadonlyArray<{
  key: TabKey;
  label: string;
  Icon: React.ComponentType<{ size?: number; stroke?: number }>;
}> = [
  { key: "sparring", label: "Studio", Icon: IconBrandHipchat },
  { key: "curriculum", label: "Curriculum", Icon: IconBook2 },
  { key: "voice-notes", label: "Voice Notes", Icon: IconMicrophone },
  { key: "vkb", label: "VKB", Icon: IconLayoutDashboard },
  { key: "feedback", label: "Feedback", Icon: IconMessage2 },
  { key: "system", label: "System", Icon: IconShieldCheck },
];

function isTabKey(v: string | null): v is TabKey {
  return (
    v === "sparring" ||
    v === "curriculum" ||
    v === "voice-notes" ||
    v === "vkb" ||
    v === "feedback" ||
    v === "system"
  );
}

interface Props {
  /** Founder id, threaded down to TrainStudio for the history
   *  fetch (ADMIN_API_SPEC §30 — ?member_id=<founder>). */
  founderId: string;
}

export function TrainAvenSectionView({ founderId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "sparring";
  const activeLabel = TABS.find((t) => t.key === activeTab)?.label ?? "Studio";

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", handler);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "sparring") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/train-aven${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {/* View switcher — single discreet trigger, right-aligned. The
          chat surface below stays the focus; this is just utility
          access to the adjacent admin surfaces. */}
      <div className="flex justify-end" ref={wrapperRef}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={open}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
          >
            <span>{activeLabel}</span>
            <IconChevronDown
              size={11}
              stroke={2}
              className={[
                "transition-transform",
                open ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {open && (
            <div
              role="menu"
              aria-label="Train Aven sections"
              className="absolute right-0 top-full z-30 mt-1.5 w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_48px_-12px_rgba(0,0,0,0.6)]"
            >
              <ul className="py-1">
                {TABS.map(({ key, label, Icon }) => {
                  const isActive = activeTab === key;
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => switchTab(key)}
                        className={[
                          "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                          isActive
                            ? "bg-emerald/[0.08] text-emerald"
                            : "text-foreground hover:bg-white/[0.04]",
                        ].join(" ")}
                      >
                        <Icon size={14} stroke={1.75} />
                        <span className="flex-1">{label}</span>
                        {isActive && (
                          <IconCheck size={12} stroke={2.25} />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>

      <section>
        {activeTab === "sparring" && <TrainStudio founderId={founderId} />}
        {activeTab === "curriculum" && <TrainAvenCurriculumTab />}
        {activeTab === "voice-notes" && <AvenVoiceNotesTab />}
        {activeTab === "vkb" && <AvenVkbTab />}
        {activeTab === "feedback" && <TrainAvenFeedbackTab />}
        {activeTab === "system" && <TrainAvenSystemTab />}
      </section>
    </div>
  );
}
