export function QuotaIndicator({
  used,
  limit,
}: {
  used: number;
  limit: number | null;
}) {
  if (limit === null) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">Aven messages today</p>
        <p className="font-mono text-sm text-emerald">Unlimited</p>
      </div>
    );
  }

  const safeUsed = Math.max(0, used);
  const safeLimit = Math.max(1, limit);
  const pct = Math.min(100, Math.round((safeUsed / safeLimit) * 100));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">Aven messages today</p>
        <p className="font-mono text-sm text-foreground">
          {safeUsed} / {safeLimit}
        </p>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeLimit}
        aria-valuenow={safeUsed}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full bg-emerald transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
