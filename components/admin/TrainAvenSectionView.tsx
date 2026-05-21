"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  IconBook2,
  IconBrandHipchat,
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

// Iteration 2: tabs become a quiet icon-pill cluster floating top-
// right above the studio. The studio room is the bühne; the tab
// nav is utility access to adjacent surfaces (curriculum / voice
// notes / VKB / feedback / system snapshot) and shouldn't compete
// with the room itself for attention. Labels surface as hover
// tooltips via the title attr — at-a-glance the row reads as 6
// quiet glyphs.
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
    <div className="space-y-3">
      {/* Tab strip — quiet icon pills, right-aligned. No admin
          headline above the studio. The studio IS the page. */}
      <nav
        aria-label="Train Aven sections"
        className="flex justify-end"
      >
        <ul className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-black/30 p-1 backdrop-blur-sm">
          {TABS.map(({ key, label, Icon }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  aria-label={label}
                  title={label}
                  className={[
                    "inline-flex size-9 items-center justify-center rounded-full transition-colors",
                    isActive
                      ? "bg-emerald/[0.14] text-emerald"
                      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon size={15} stroke={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section>
        {activeTab === "sparring" && <TrainStudio />}
        {activeTab === "curriculum" && <TrainAvenCurriculumTab />}
        {activeTab === "voice-notes" && <AvenVoiceNotesTab />}
        {activeTab === "vkb" && <AvenVkbTab />}
        {activeTab === "feedback" && <TrainAvenFeedbackTab />}
        {activeTab === "system" && <TrainAvenSystemTab />}
      </section>
    </div>
  );
}
