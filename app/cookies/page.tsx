import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

// BOILERPLATE: Requires legal review before beta launch.

export const metadata: Metadata = {
  title: "Cookie Policy · PT System",
  description: "How PT System uses cookies.",
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
          <p className="mt-3 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
            How we use cookies on PT System.
          </p>

          <div className="mt-12 space-y-10 text-base leading-[1.75] text-muted-foreground sm:text-[17px]">
            <Section title="1. What are cookies">
              <p>
                Cookies are small text files stored on your device when
                you visit a website. They help websites remember
                information about your visit, such as your preferences
                and login state.
              </p>
            </Section>

            <Section title="2. Cookies we use">
              <p>
                <strong className="text-foreground">
                  Essential cookies
                </strong>{" "}
                — required for the service to function. These manage
                authentication, session state, and security. The
                service cannot operate without them.
              </p>
              <p>
                <strong className="text-foreground">
                  Analytics cookies
                </strong>{" "}
                — help us understand how the service is used and
                improve performance. We use privacy-focused analytics
                that do not identify individual users.
              </p>
              <p>
                <strong className="text-foreground">
                  Functional cookies
                </strong>{" "}
                — remember your preferences such as language, theme,
                and dashboard layout.
              </p>
            </Section>

            <Section title="3. Third-party cookies">
              <p>
                The following third-party services may set cookies when
                you use PT System:
              </p>
              <ul>
                <li>Stripe (payment processing)</li>
                <li>Cloudflare (security and performance)</li>
                <li>Vercel (hosting and analytics)</li>
              </ul>
              <p>
                Each service operates under its own privacy and cookie
                policies.
              </p>
            </Section>

            <Section title="4. Managing cookies">
              <p>
                Most browsers allow you to control cookies through
                their settings. You can typically:
              </p>
              <ul>
                <li>View what cookies are stored</li>
                <li>Delete existing cookies</li>
                <li>Block third-party cookies</li>
                <li>
                  Block all cookies (this will break essential
                  functionality)
                </li>
              </ul>
              <p>
                Note that blocking essential cookies will prevent you
                from signing in or using core features.
              </p>
            </Section>

            <Section title="5. Updates to this policy">
              <p>
                We may update this Cookie Policy. Material changes will
                be communicated via the service.
              </p>
            </Section>

            <Section title="6. Contact">
              <p>
                For cookie-related questions:{" "}
                <a
                  href="mailto:hello@ptsystem.ai"
                  className="text-emerald transition-colors hover:text-emerald-hover"
                >
                  hello@ptsystem.ai
                </a>
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
