import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "PT System privacy policy — placeholder page during Phase 1.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
          </div>

          <div className="mt-10 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
            <p>
              PT System is in Phase 1. A detailed privacy policy will be
              published before Beta launch.
            </p>
            <p>
              Until then: information you submit through the waitlist form
              (email, name, trading background) is stored solely to contact
              you about Beta access. We don&apos;t share it with third
              parties. We retain your IP address briefly to prevent
              spam.
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
