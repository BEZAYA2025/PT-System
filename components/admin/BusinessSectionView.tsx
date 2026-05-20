"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { BusinessOverviewTab } from "./business/BusinessOverviewTab";
import { BusinessRevenueTab } from "./business/BusinessRevenueTab";
import { BusinessCohortsTab } from "./business/BusinessCohortsTab";
import { BusinessRefundsTab } from "./business/BusinessRefundsTab";
import { BusinessStripeSyncTab } from "./business/BusinessStripeSyncTab";
import { BusinessAffiliatesTab } from "./business/BusinessAffiliatesTab";

type TabKey =
  | "overview"
  | "revenue"
  | "cohorts"
  | "refunds"
  | "stripe-sync"
  | "affiliates";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "revenue", label: "Revenue" },
  { key: "cohorts", label: "Cohorts" },
  { key: "refunds", label: "Refunds" },
  { key: "stripe-sync", label: "Stripe Sync" },
  { key: "affiliates", label: "Affiliates" },
];

function isTabKey(v: string | null): v is TabKey {
  return (
    v === "overview" ||
    v === "revenue" ||
    v === "cohorts" ||
    v === "refunds" ||
    v === "stripe-sync" ||
    v === "affiliates"
  );
}

export function BusinessSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "overview";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "overview") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/business${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Business
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revenue, cohorts, refund history, Stripe drift detection,
          and the affiliate program.
        </p>
      </header>

      <nav
        aria-label="Business section tabs"
        className="overflow-x-auto sm:overflow-visible"
      >
        <ul className="flex min-w-max gap-1 sm:min-w-0">
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
        {activeTab === "overview" && <BusinessOverviewTab />}
        {activeTab === "revenue" && <BusinessRevenueTab />}
        {activeTab === "cohorts" && <BusinessCohortsTab />}
        {activeTab === "refunds" && <BusinessRefundsTab />}
        {activeTab === "stripe-sync" && <BusinessStripeSyncTab />}
        {activeTab === "affiliates" && <BusinessAffiliatesTab />}
      </section>
    </div>
  );
}
