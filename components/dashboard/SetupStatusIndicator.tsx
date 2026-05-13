import { Check } from "lucide-react";

export function SetupStatusIndicator() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-emerald">
      <Check aria-hidden strokeWidth={2.5} className="size-3" />
      All set
    </span>
  );
}
