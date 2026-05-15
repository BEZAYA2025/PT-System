// Shared header for settings sub-cards. Round-10 polish layer: prominent
// uppercase eyebrow in brand-green over the title, optional right-side
// slot for status badges (Subscription card uses it). Keeps the four
// settings sections visually consistent.

interface Props {
  eyebrow: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}

export function SettingsCardHeader({
  eyebrow,
  title,
  description,
  right,
}: Props) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
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
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
