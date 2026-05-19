import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/SignInForm";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Sign In · PT System",
  description: "Sign in to the PT System member dashboard.",
  alternates: { canonical: "/signin" },
};

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-6 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-md">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Sign in
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Welcome back. Access your dashboard, briefings, and
              trades.
            </p>
          </div>

          <div className="mt-10">
            <Suspense fallback={null}>
              <SignInForm />
            </Suspense>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/pricing"
              className="font-medium text-emerald transition-colors hover:text-emerald-hover"
            >
              Start free trial →
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
