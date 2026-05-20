"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AvenLiveTab } from "./AvenLiveTab";
import { AvenSearchTab } from "./AvenSearchTab";
import { AvenCurriculumTab } from "./AvenCurriculumTab";
import { AvenTokenUsageTab } from "./AvenTokenUsageTab";
import { AvenDriftLogTab } from "./AvenDriftLogTab";
import { AvenVoiceNotesTab } from "./AvenVoiceNotesTab";
import { AvenQualityAuditTab } from "./AvenQualityAuditTab";
import { AvenVkbTab } from "./AvenVkbTab";

type TabKey =
  | "live"
  | "search"
  | "curriculum"
  | "tokens"
  | "drift"
  | "voice-notes"
  | "quality"
  | "vkb";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "live", label: "Live" },
  { key: "search", label: "Search" },
  { key: "curriculum", label: "Curriculum" },
  { key: "tokens", label: "Token Usage" },
  { key: "drift", label: "Drift Log" },
  { key: "voice-notes", label: "Voice Notes" },
  { key: "quality", label: "Quality Audit" },
  { key: "vkb", label: "VKB" },
];

function isTabKey(v: string | null): v is TabKey {
  return (
    v === "live" ||
    v === "search" ||
    v === "curriculum" ||
    v === "tokens" ||
    v === "drift" ||
    v === "voice-notes" ||
    v === "quality" ||
    v === "vkb"
  );
}

export function AvenSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "live";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "live") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/aven${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Aven Insights
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live conversations, search across history, curriculum
          coverage, token spend, drift detection, and the vector
          knowledge base.
        </p>
      </header>

      <nav
        aria-label="Aven section tabs"
        className="sticky top-0 z-20 -mx-4 overflow-x-auto border-b border-border bg-[#0a0a0a]/95 px-4 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
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
                    "relative inline-flex h-11 items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium transition-colors",
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
        {activeTab === "live" && <AvenLiveTab />}
        {activeTab === "search" && <AvenSearchTab />}
        {activeTab === "curriculum" && <AvenCurriculumTab />}
        {activeTab === "tokens" && <AvenTokenUsageTab />}
        {activeTab === "drift" && <AvenDriftLogTab />}
        {activeTab === "voice-notes" && <AvenVoiceNotesTab />}
        {activeTab === "quality" && <AvenQualityAuditTab />}
        {activeTab === "vkb" && <AvenVkbTab />}
      </section>
    </div>
  );
}
