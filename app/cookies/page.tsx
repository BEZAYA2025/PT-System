import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before launch.

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "PT System cookie policy — what we use and why.",
  alternates: { canonical: "/cookies" },
  robots: { index: true, follow: true },
};

export default function CookiesPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Cookie Policy
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Last updated: 19 May 2026 · Boilerplate, subject to legal review
          </p>

          <div className="mt-10 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="What are cookies?">
              <p>
                Cookies are small text files that websites place on your
                device when you visit them. They&apos;re used to make
                websites work more efficiently, to remember your
                preferences, and to provide information to the site
                owner. Cookies set by us are called &ldquo;first-party
                cookies&rdquo;; cookies set by other providers we use
                are called &ldquo;third-party cookies&rdquo;.
              </p>
              <p>
                This policy explains what cookies PT System uses, why
                we use them, and how you can manage them.
              </p>
            </Section>

            <Section title="Cookies we use">
              <p>
                We group cookies into three categories based on what
                they&apos;re for:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Essential.</strong>{" "}
                  Required for the site to function — authentication
                  sessions, CSRF tokens, and load balancing. These
                  can&apos;t be disabled without breaking the site.
                </li>
                <li>
                  <strong className="text-foreground">Analytics.</strong>{" "}
                  Help us understand how members and visitors use the
                  site so we can improve it. Aggregate usage data only;
                  no individual identification beyond what&apos;s
                  necessary for the analytics provider to function.
                </li>
                <li>
                  <strong className="text-foreground">Marketing.</strong>{" "}
                  Set when you arrive via a marketing link so we can
                  attribute the source and avoid showing you the same
                  ad twice. We don&apos;t sell or share marketing
                  cookie data with third parties.
                </li>
              </ul>
            </Section>

            <Section title="Third-party cookies">
              <p>
                We use a small number of third-party services that may
                set cookies on your device while you use PT System:
              </p>
              <ul>
                <li>
                  <strong className="text-foreground">Stripe</strong> —
                  payment processing. Sets cookies only when you reach
                  a checkout flow. Stripe&apos;s own cookie policy at{" "}
                  <a
                    href="https://stripe.com/cookie-settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald transition-colors hover:text-emerald-hover"
                  >
                    stripe.com/cookie-settings
                  </a>{" "}
                  governs these.
                </li>
                <li>
                  <strong className="text-foreground">Cloudflare</strong>{" "}
                  — bot mitigation and CDN. Sets a `__cf_bm` cookie that
                  expires after 30 minutes; used purely to distinguish
                  human visitors from automated traffic.
                </li>
                <li>
                  <strong className="text-foreground">
                    Vercel Analytics
                  </strong>{" "}
                  — first-party aggregate analytics. Stores anonymous,
                  hashed identifiers; no cross-site tracking.
                </li>
              </ul>
            </Section>

            <Section title="How to manage cookies">
              <p>
                Every major browser lets you view, manage, and delete
                cookies through its settings. Look for a menu called
                Privacy, Security, or Site Data:
              </p>
              <ul>
                <li>
                  Chrome — Settings → Privacy and security → Cookies
                  and other site data.
                </li>
                <li>
                  Firefox — Preferences → Privacy &amp; Security →
                  Cookies and Site Data.
                </li>
                <li>
                  Safari — Preferences → Privacy → Cookies and website
                  data.
                </li>
                <li>
                  Edge — Settings → Cookies and site permissions.
                </li>
              </ul>
              <p>
                Disabling cookies entirely will sign you out of PT
                System and may break parts of the site. Disabling only
                analytics or marketing cookies is supported and will
                not break functionality.
              </p>
            </Section>

            <Section title="Updates to this policy">
              <p>
                We may update this policy when we add or remove
                cookies, or when our third-party providers change
                their own cookie usage. The &ldquo;Last updated&rdquo;
                date at the top of this page reflects the most recent
                revision.
              </p>
            </Section>

            <Section title="Contact us">
              <p>
                Questions about our use of cookies? Reach the team at{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}
