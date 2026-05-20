"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SystemServicesTab } from "./system/SystemServicesTab";
import { SystemWebhooksTab } from "./system/SystemWebhooksTab";
import { SystemErrorsTab } from "./system/SystemErrorsTab";
import { SystemDatabaseTab } from "./system/SystemDatabaseTab";
import { SystemPerformanceTab } from "./system/SystemPerformanceTab";

type TabKey =
  | "services"
  | "webhooks"
  | "errors"
  | "database"
  | "performance";

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "services", label: "Services" },
  { key: "webhooks", label: "Webhooks" },
  { key: "errors", label: "Errors" },
  { key: "database", label: "Database" },
  { key: "performance", label: "Performance" },
];

function isTabKey(v: string | null): v is TabKey {
  return (
    v === "services" ||
    v === "webhooks" ||
    v === "errors" ||
    v === "database" ||
    v === "performance"
  );
}

export function SystemSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "services";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "services") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/system${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          System
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Service health, webhook + error logs, database state, and
          performance metrics.
        </p>
      </header>

      <nav
        aria-label="System section tabs"
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
        {activeTab === "services" && <SystemServicesTab />}
        {activeTab === "webhooks" && <SystemWebhooksTab />}
        {activeTab === "errors" && <SystemErrorsTab />}
        {activeTab === "database" && <SystemDatabaseTab />}
        {activeTab === "performance" && <SystemPerformanceTab />}
      </section>
    </div>
  );
}
