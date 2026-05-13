import type { Tier } from "@/lib/dal";
import { badgeClasses, badgeEmeraldClasses } from "@/lib/ui";

export function TierBadge({ tier }: { tier: Tier }) {
  const isVip = tier === "vip";
  return (
    <span className={isVip ? badgeEmeraldClasses : badgeClasses}>
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${isVip ? "bg-emerald" : "bg-muted-foreground"}`}
      />
      {isVip ? "VIP" : "Standard"}
    </span>
  );
}
