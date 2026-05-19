import type { Metadata } from "next";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password · PT System",
  description: "Request a password reset link.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
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
              Forgot your password?
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </header>

          <div className="mt-8">
            <ForgotPasswordForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
