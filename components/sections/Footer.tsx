import Link from "next/link";
import { BrandLogo } from "@/components/dashboard/BrandLogo";

// Round-35 footer — three columns (Brand · Product · Legal & Info)
// over the same three-line bottom bar. The previous "Company" column
// is merged into "Legal & Info" via the new /contact page that
// carries the company-information sections inside it, so we don't
// need a separate column for them. The "Status · Built in public"
// caption is also gone — the platform has shipped, no more phase
// labels.

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-6 sm:grid-cols-3 sm:gap-12">
          <FooterBrand />
          <FooterColumn
            title="Product"
            items={[
              { label: "Pricing", href: "/pricing" },
              { label: "About", href: "/#about" },
              { label: "Sign in", href: "/signin" },
            ]}
          />
          <FooterColumn
            title="Legal & Info"
            items={[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookies" },
              { label: "Refund Policy", href: "/refund" },
              { label: "Contact", href: "/contact" },
            ]}
          />
        </div>

        {/* Bottom bar — three lines, smaller text. Lines 1 and 2 use
            the standard muted-foreground; line 3 (the risk
            disclaimer) goes a touch dimmer (muted/70) so it reads as
            mandatory fine print rather than headline copy. Tighter
            line-height + smaller mt on mobile so the footer doesn't
            feel endless on phones. */}
        <div className="mt-8 space-y-1.5 border-t border-border pt-5 text-xs leading-snug text-muted-foreground sm:mt-16 sm:space-y-2 sm:pt-8 sm:leading-relaxed">
          <p>PT System is a product of Fortex Media Ltd.</p>
          <p>© 2026 PT System. All rights reserved.</p>
          <p className="text-muted-foreground/70">
            Trading cryptocurrency futures involves substantial risk of
            loss. PT System provides educational content only and does
            not constitute financial, investment, or trading advice.
            Past performance is not indicative of future results.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterBrand() {
  return (
    <div>
      <Link
        href="/"
        aria-label="PT System — home"
        className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground transition-colors hover:text-emerald sm:text-lg"
      >
        <BrandLogo size={20} />
        <span>PT System</span>
      </Link>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        Aven · Your AI trading mentor.
      </p>
      {/* Reserved space for the future social-icon row — kept so the
          column rhythm stays the same when those icons land. Hidden
          on mobile so the brand block doesn't leave a 32px hole at
          the top of the stack. */}
      <div aria-hidden className="hidden h-8 sm:mt-5 sm:block" />
    </div>
  );
}

interface FooterItem {
  label: string;
  href: string;
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: ReadonlyArray<FooterItem>;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
