import Link from "next/link";
import { BrandLogo } from "@/components/dashboard/BrandLogo";

// Round-30 footer rebuild — four columns (Brand · Product · Company ·
// Legal) over a three-line bottom-bar (legal entity, copyright, risk
// disclaimer). Authed-only dashboard / sign-out shortcuts live in the
// site header now, not the footer; the footer is purely public-page
// navigation so it stays consistent for visitors and members alike.

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <FooterBrand />
          <FooterColumn
            title="Product"
            items={[
              { label: "Pricing", href: "/pricing" },
              { label: "Start Free Trial", href: "/signup" },
              { label: "Sign in", href: "/signin" },
            ]}
          />
          <FooterColumn
            title="Company"
            items={[
              { label: "About Paul", href: "/#founder" },
              {
                label: "Contact",
                href: "mailto:hello@ptsystem.ai",
                external: true,
              },
            ]}
            extra={
              <li className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground/70">
                Status · Built in public
              </li>
            }
          />
          <FooterColumn
            title="Legal"
            items={[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookies" },
              { label: "Refund Policy", href: "/refund" },
              { label: "Impressum", href: "/impressum" },
            ]}
          />
        </div>

        {/* Bottom bar — three lines, smaller text, dezent. */}
        <div className="mt-12 space-y-2 border-t border-border pt-8 text-xs leading-relaxed text-muted-foreground sm:mt-16">
          <p>
            PT System is a product of Fortex Media Ltd. · 71-75 Shelton
            Street, London, UK WC2H 9JQ
          </p>
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

// ---------------------------------------------------------------------------
// Column 1 — Brand. Logo + wordmark + tagline. Social-icon row slot
// reserved (empty container) for the future X / YouTube links so the
// vertical rhythm stays the same when those land.
// ---------------------------------------------------------------------------

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
        Your AI trading mentor.
      </p>
      {/* Social row slot — populated in a later round. */}
      <div aria-hidden className="mt-5 h-8" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Generic column.
// ---------------------------------------------------------------------------

interface FooterItem {
  label: string;
  href: string;
  external?: boolean;
}

function FooterColumn({
  title,
  items,
  extra,
}: {
  title: string;
  items: ReadonlyArray<FooterItem>;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/80">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item.label}>
            {item.external ? (
              <a
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={item.href}
                className="transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
        {extra}
      </ul>
    </div>
  );
}
