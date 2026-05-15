import { IconDownload, IconTrash } from "@tabler/icons-react";
import { cardClasses } from "@/lib/ui";
import { SettingsCardHeader } from "./SettingsCardHeader";

// Round-13d: surfaces the two GDPR rights every member has — data export
// + account deletion — even though neither endpoint exists on the VPS
// yet. Frontend honours the rights by routing both flows through
// hello@ptsystem.ai for now; once /api/auth/export-data and
// /api/auth/delete-account ship server-side, the two buttons become
// self-serve forms instead of mailto-links.

export function PrivacyDataCard() {
  return (
    <section className={cardClasses}>
      <SettingsCardHeader
        eyebrow="Privacy · Data"
        title="Your data"
        description="Under GDPR / DSGVO you can request an export of everything we store on you, or have your account deleted permanently."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <PrivacyRow
          href="mailto:hello@ptsystem.ai?subject=Data%20export%20request"
          icon={<IconDownload size={16} stroke={1.75} aria-hidden />}
          title="Request data export"
          subtitle="Email us — we reply within 30 days with a JSON archive of your account, trades, briefings, and Aven history."
        />
        <PrivacyRow
          href="mailto:hello@ptsystem.ai?subject=Delete%20account%20%E2%80%94%20permanent"
          icon={<IconTrash size={16} stroke={1.75} aria-hidden />}
          title="Delete account"
          subtitle="Permanent. Wipes your account, keys, trade history, and Aven conversations. We confirm by email before acting."
          tone="red"
        />
      </div>
    </section>
  );
}

function PrivacyRow({
  href,
  icon,
  title,
  subtitle,
  tone = "neutral",
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: "neutral" | "red";
}) {
  const wrapper =
    tone === "red"
      ? "border-red-500/30 bg-red-500/[0.04] hover:border-red-500/50"
      : "border-border bg-surface hover:border-emerald/40 hover:bg-emerald/[0.04]";
  const iconWrap =
    tone === "red"
      ? "bg-red-500/[0.08] text-red-300"
      : "bg-emerald/[0.08] text-emerald";
  const titleTone = tone === "red" ? "text-red-200" : "text-foreground";

  return (
    <a
      href={href}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${wrapper}`}
    >
      <span
        className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ${iconWrap}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${titleTone}`}>
          {title}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">
          {subtitle}
        </span>
      </span>
    </a>
  );
}
