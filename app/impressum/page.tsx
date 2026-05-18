import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before launch.

export const metadata: Metadata = {
  title: "Impressum",
  description:
    "Legal information for PT System, a product of Fortex Media Ltd.",
  alternates: { canonical: "/impressum" },
  robots: { index: true, follow: true },
};

export default function ImpressumPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Impressum
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Last updated: 19 May 2026 · Boilerplate, subject to legal review
          </p>

          <div className="mt-10 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="Company Information">
              <dl className="space-y-3">
                <Field label="Name">Fortex Media Ltd.</Field>
                <Field label="Address">
                  71-75 Shelton Street
                  <br />
                  Covent Garden
                  <br />
                  London, United Kingdom
                  <br />
                  WC2H 9JQ
                </Field>
                <Field label="Company Number">
                  17000836 (Companies House, England &amp; Wales)
                </Field>
                <Field label="VAT">
                  Not registered for VAT at this time.
                </Field>
              </dl>
            </Section>

            <Section title="Contact">
              <dl className="space-y-3">
                <Field label="Legal / business correspondence">
                  <a
                    href="mailto:hello@fortex-media.com"
                    className="text-emerald transition-colors hover:text-emerald-hover"
                  >
                    hello@fortex-media.com
                  </a>
                </Field>
                <Field label="Member support">
                  <a
                    href="mailto:hello@ptsystem.ai"
                    className="text-emerald transition-colors hover:text-emerald-hover"
                  >
                    hello@ptsystem.ai
                  </a>
                </Field>
              </dl>
              <p className="text-sm text-muted-foreground/80">
                The Fortex address is reserved for legal and company
                correspondence. For platform questions, billing,
                onboarding, or anything PT System related, please use
                the member-support address — it&apos;s monitored by
                the product team.
              </p>
            </Section>

            <Section title="Responsible Person">
              <dl className="space-y-3">
                <Field label="Director">Paul, Director</Field>
              </dl>
            </Section>

            <Section title="Disclaimer">
              <p>
                <strong className="text-foreground">
                  Trading risk.
                </strong>{" "}
                Trading cryptocurrency futures involves substantial
                risk of loss and is not suitable for every investor.
                Past performance is not indicative of future results.
                PT System provides educational content only and does
                not constitute financial, investment, or trading
                advice. You are solely responsible for any trading
                decisions you make.
              </p>
              <p>
                <strong className="text-foreground">
                  Content liability.
                </strong>{" "}
                We compile and publish information on PT System with
                reasonable care, but we make no representation or
                warranty as to the accuracy, completeness, or
                timeliness of any content. To the extent permitted by
                law, Fortex Media Ltd. is not liable for any loss
                arising from reliance on platform content.
              </p>
              <p>
                <strong className="text-foreground">
                  External links.
                </strong>{" "}
                Where PT System links to third-party websites, those
                sites are outside our control. We disclaim
                responsibility for the content, accuracy, or
                availability of any externally linked resource. The
                relevant operator&apos;s own terms apply to your use
                of those sites.
              </p>
            </Section>

            <Section title="Dispute Resolution">
              <p>
                <strong className="text-foreground">
                  EU Online Dispute Resolution.
                </strong>{" "}
                The European Commission provides an online dispute
                resolution platform at{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  ec.europa.eu/consumers/odr
                </a>
                .
              </p>
              <p>
                We are not obligated and not willing to participate in
                dispute resolution proceedings before consumer
                arbitration boards. If you have a complaint, contact
                us first at the member-support address above — we aim
                to resolve issues directly and quickly.
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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}
