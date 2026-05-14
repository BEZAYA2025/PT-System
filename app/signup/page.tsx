import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WaitlistForm } from "@/components/WaitlistForm";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Join the Waitlist",
  description:
    "Sign up for the PT System waitlist. We'll reach out when Beta opens.",
  alternates: { canonical: "/signup" },
};

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-xl">
          <div>
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
