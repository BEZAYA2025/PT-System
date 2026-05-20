"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TrainAvenSparringTab } from "./train-aven/TrainAvenSparringTab";
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

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "sparring", label: "Sparring Chat" },
  { key: "curriculum", label: "Curriculum" },
  { key: "voice-notes", label: "Voice Notes" },
  { key: "vkb", label: "VKB Studio" },
  { key: "feedback", label: "Feedback Reviewer" },
  { key: "system", label: "System View" },
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

export function TrainAvenSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "sparring";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "sparring") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/train-aven${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Train Aven
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spar with Aven, edit curriculum, record voice notes, manage
          VKB, review feedback, and inspect the active system snapshot.
        </p>
      </header>

      <nav
        aria-label="Train Aven tabs"
        className="-mx-4 overflow-x-auto border-b border-border bg-[#0a0a0a]/95 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
      >
        <ul className="flex min-w-max gap-1">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex h-11 items-center px-3 text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-emerald"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section>
        {activeTab === "sparring" && <TrainAvenSparringTab />}
        {activeTab === "curriculum" && <TrainAvenCurriculumTab />}
        {activeTab === "voice-notes" && <AvenVoiceNotesTab />}
        {activeTab === "vkb" && <AvenVkbTab />}
        {activeTab === "feedback" && <TrainAvenFeedbackTab />}
        {activeTab === "system" && <TrainAvenSystemTab />}
      </section>
    </div>
  );
}
