import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { VerifyEmailFlow } from "./VerifyEmailFlow";

export const metadata: Metadata = {
  title: "Verify email · PT System",
  description: "Verifying your email address to complete account setup.",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center justify-center px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-md">
          <Suspense fallback={<VerifyingFallback />}>
            <VerifyEmailFlow />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}

// Render-time placeholder while the client-only `useSearchParams` hook
// inside <VerifyEmailFlow /> resolves. Same outer shell so the page
// doesn't jump on hydration.
function VerifyingFallback() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-8 text-center sm:p-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        Verifying your email…
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">Just a moment.</p>
    </div>
  );
}
