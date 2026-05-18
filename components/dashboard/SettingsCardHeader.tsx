// Shared header for settings sub-cards. Round-13e adds an optional
// `icon` slot — emerald-tinted square on the left so each section reads
// as a unique entry at a glance, not a wall of identical cards.

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  /** Optional icon — rendered in an emerald square to the left of the
   *  eyebrow/title block. Skip for cards that don't have a matching glyph. */
  icon?: React.ReactNode;
}

export function SettingsCardHeader({
  eyebrow,
  title,
  description,
  right,
  icon,
}: Props) {
  return (
    // Round-27 mobile-fix: the `right` slot (status badge etc.) used
    // to sit on the same flex row as the title block via
    // `justify-between`. On a 360px viewport the badge plus the title
    // fought for the same ~300px of horizontal space and the title
    // either truncated awkwardly or pushed the badge off-screen. Now
    // the header is `flex-col` on mobile — the badge wraps to its own
    // row below the title block — and only collapses back to
    // side-by-side at `sm` where there's room.
    <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3 sm:flex-1 sm:gap-4">
        {icon && (
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald/[0.08] text-emerald ring-1 ring-emerald/20">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-emerald/85">
            {eyebrow}
          </p>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
