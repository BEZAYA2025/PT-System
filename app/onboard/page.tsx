import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { OnboardClient } from "./OnboardClient";

// Round-43: /onboard rewritten around the new email-verification
// flow. Auth handoff happens via an `onboarding_token` set by
// /verify-email in localStorage (or passed through as a fallback
// query param when localStorage isn't usable). No more URL-token
// validation in the server component — the page is just a shell
// around the client form. If the token is missing the client
// redirects to /signin.

export const metadata: Metadata = {
  title: "Welcome to PT System",
  description:
    "One more step. Set your password to access your dashboard.",
  robots: { index: false, follow: false },
};

export default function OnboardPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-6 py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-md">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Welcome to PT System
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              One more step. Set your password to access your dashboard.
            </p>
          </header>

          <div className="mt-8">
            <Suspense fallback={null}>
              <OnboardClient />
            </Suspense>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
