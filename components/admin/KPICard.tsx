import Link from "next/link";
import { IconAlertCircle, IconArrowRight } from "@tabler/icons-react";

interface Props {
  title: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  cta?: string;
  /** Accent color for the value text. Defaults to foreground. */
  tone?: "default" | "success" | "warning" | "danger";
  error?: boolean;
}

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  success: "text-emerald",
  warning: "text-amber-300",
  danger: "text-red-300",
};

export function KPICard({
  title,
  value,
  hint,
  href,
  cta,
  tone = "default",
  error,
}: Props) {
  if (error) {
    return (
      <article className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface/50 p-5">
        <header>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
        </header>
        <div className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <IconAlertCircle
            size={16}
            stroke={1.75}
            className="mt-0.5 shrink-0 text-amber-400"
            aria-hidden
          />
          <span>Couldn&apos;t load. Try refreshing the page.</span>
        </div>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface/50 p-5 transition-colors hover:border-emerald/30">
      <header className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </header>
      <div className="mt-3 flex flex-col gap-1">
        <p
          className={`text-3xl font-semibold tracking-tight ${TONE[tone]}`}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
      {href && cta && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 self-start rounded-md text-xs font-medium text-emerald transition-colors hover:text-emerald-hover"
        >
          {cta}
          <IconArrowRight size={12} stroke={2} aria-hidden />
        </Link>
      )}
    </article>
  );
}
