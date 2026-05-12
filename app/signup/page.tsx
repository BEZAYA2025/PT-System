import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "@/components/WaitlistForm";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Sign up for the PT System waitlist. We'll reach out when Beta opens.",
  alternates: { canonical: "/signup" },
};

export default function SignupPage() {
  return (
    <>
      <main id="main" className="flex-1 px-6 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back
          </Link>

          <div className="mt-10 sm:mt-12">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Join the PT System Waitlist
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              We&apos;ll reach out when Beta opens.
            </p>
          </div>

          <div className="mt-12">
            <WaitlistForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
