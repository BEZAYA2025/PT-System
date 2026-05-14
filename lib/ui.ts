// Shared className constants used across forms and member-cockpit screens.
// Keeps utility strings short and consistent with the WaitlistForm pattern.

export const inputClasses =
  "w-full rounded-lg border border-border bg-surface px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-emerald focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald";

export const labelClasses = "block text-sm font-medium text-foreground";

export const helperClasses = "mt-2 text-xs text-muted-foreground";

export const errorClasses = "mt-2 text-xs text-red-400";

export const buttonPrimaryClasses =
  "inline-flex h-12 items-center justify-center rounded-full bg-emerald px-8 text-sm font-medium text-background transition-colors duration-200 hover:bg-emerald-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-60";

export const buttonSecondaryClasses =
  "inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-60";

export const buttonGhostClasses =
  "inline-flex h-10 items-center justify-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald";

export const cardClasses =
  "rounded-2xl border border-border bg-surface p-6 sm:p-8";

export const cardElevatedClasses =
  "rounded-2xl border border-border bg-surface-elevated p-6 sm:p-8";

export const badgeClasses =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground";

export const badgeEmeraldClasses =
  "inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/[0.08] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.1em] text-emerald";

export const submitErrorClasses =
  "rounded-lg border border-red-500/30 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300";

export const submitSuccessClasses =
  "rounded-lg border border-emerald/30 bg-emerald/[0.06] px-4 py-3 text-sm text-emerald";
