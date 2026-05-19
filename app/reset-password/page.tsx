import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { ResetPasswordFlow } from "./ResetPasswordFlow";

export const metadata: Metadata = {
  title: "Set new password · PT System",
  description: "Set a new password for your PT System account.",
  alternates: { canonical: "/reset-password" },
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-6 py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-md">
          <Suspense fallback={null}>
            <ResetPasswordFlow />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
