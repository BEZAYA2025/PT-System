import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "PT System terms of service — placeholder page during Phase 1.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <main id="main" className="flex-1 px-6 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>

          <div className="mt-10 sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Terms of Service
            </h1>
          </div>

          <div className="mt-10 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
            <p>
              PT System is in Phase 1. Detailed terms of service will be
              published before Beta launch.
            </p>
            <p>
              Nothing on this site constitutes financial advice. Trading
              involves substantial risk of loss. PT System is an
              educational and research product, not an investment service.
            </p>
            <p>
              For inquiries, contact{" "}
              <a
                href="mailto:hello@ptsystem.ai"
                className="text-emerald transition-colors hover:text-emerald-hover"
              >
                hello@ptsystem.ai
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
