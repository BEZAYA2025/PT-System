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
    <header className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
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
