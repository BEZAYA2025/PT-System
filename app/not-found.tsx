import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { Footer } from "@/components/sections/Footer";

export const metadata: Metadata = {
  title: "Page not found · PT System",
  description: "The page you're looking for doesn't exist or has been moved.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="flex flex-1 items-center justify-center px-6 py-16 sm:py-24"
      >
        <div className="mx-auto flex min-h-[55vh] w-full max-w-xl flex-col items-center justify-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-emerald/[0.06] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.15em] text-emerald/85">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.65)]"
            />
            404
          </span>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Page not found
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg sm:leading-[1.7]">
            The page you&apos;re looking for doesn&apos;t exist or has
            been moved.
          </p>
          <p className="mt-2 text-sm italic text-muted-foreground/70">
            Even Aven can&apos;t find that one.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-full bg-emerald px-6 text-sm font-semibold text-background transition-colors duration-200 hover:bg-emerald-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald"
            >
              Back to home
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-6 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 hover:bg-surface-elevated focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald"
            >
              View pricing
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
