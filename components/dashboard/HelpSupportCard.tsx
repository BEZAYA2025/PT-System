import Link from "next/link";
import {
  IconExternalLink,
  IconFileText,
  IconLifebuoy,
  IconMailbox,
  IconShieldCheck,
} from "@tabler/icons-react";
import { cardClasses } from "@/lib/ui";
import { SettingsCardHeader } from "./SettingsCardHeader";

// Round-13d: ships the three help-resources the Member-Cockpit needs to
// surface today (privacy, terms, contact). FAQ stays a backlog item —
// no public FAQ page exists yet, so a stub link would be a dead-end.

export function HelpSupportCard() {
  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Help · Support"
        title="Help & legal"
        description="The legal pages, plus the inbox to reach Paul + the team."
        icon={<IconLifebuoy size={18} stroke={1.75} aria-hidden />}
      />

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        <HelpRow
          href="mailto:hello@ptsystem.ai"
          icon={<IconMailbox size={16} stroke={1.75} aria-hidden />}
          title="Contact support"
          subtitle="hello@ptsystem.ai"
          external
        />
        <HelpRow
          href="/privacy"
          icon={<IconShieldCheck size={16} stroke={1.75} aria-hidden />}
          title="Privacy policy"
          subtitle="What we store, why, and for how long"
        />
        <HelpRow
          href="/terms"
          icon={<IconFileText size={16} stroke={1.75} aria-hidden />}
          title="Terms of service"
          subtitle="The agreement you accepted at signup"
        />
      </ul>
    </section>
  );
}

function HelpRow({
  href,
  icon,
  title,
  subtitle,
  external,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  external?: boolean;
}) {
  const Inner = (
    <span className="flex items-start gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-emerald/40 hover:bg-emerald/[0.04]">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-emerald/[0.08] text-emerald">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
          {subtitle}
        </span>
      </span>
      {external && (
        <IconExternalLink
          size={12}
          stroke={1.75}
          className="mt-1 text-muted-foreground"
          aria-hidden
        />
      )}
    </span>
  );

  if (external) {
    return (
      <li>
        <a href={href} className="block">
          {Inner}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link href={href} className="block">
        {Inner}
      </Link>
    </li>
  );
}
