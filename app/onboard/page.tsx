import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { OnboardClient } from "./OnboardClient";

// /onboard accepts two token handoffs:
//   · Backend welcome-email link: /onboard?token=<signup_token>
//     → POSTs to /api/proxy/auth/complete-signup with the token in
//       the body.
//   · /verify-email handoff: onboarding_token in localStorage (or
//     ?onboarding_token=… when storage is blocked)
//     → POSTs to /api/proxy/auth/complete-onboarding with a Bearer
//       Authorization header.
// The URL token wins when both are present. If neither resolves the
// client redirects to /signin.

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
