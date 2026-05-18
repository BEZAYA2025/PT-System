import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { BrandLogo } from "@/components/dashboard/BrandLogo";
import { SiteHeaderMobileMenu } from "./SiteHeaderMobileMenu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAuthed = user !== null;

  return (
    // Sticky with a subtle backdrop blur so the chrome reads cleanly
    // even when colourful section content scrolls underneath. `bg-
    // background/80` keeps it opaque enough to mask the page but
    // light enough for the blur to register.
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:h-16">
        {/* Brand mark — left side, same emerald triangle the dashboard
            uses. Single root link to the landing page. */}
        <Link
          href="/"
          aria-label="PT System — home"
          className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground transition-colors hover:text-emerald sm:text-lg"
        >
          <BrandLogo size={20} />
          <span>PT System</span>
        </Link>

        {/* Desktop nav — Pricing · Sign in · primary CTA. Mobile sees
            this collapsed into the SiteHeaderMobileMenu below. */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-3 sm:flex"
        >
          <Link
            href="/pricing"
            className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>

          {isAuthed ? (
            <>
              <SignOutButton
                label="Sign out"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
              />
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-full bg-emerald px-4 text-sm font-medium text-background transition-colors hover:bg-emerald-hover sm:h-10 sm:px-5"
              >
                Open Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="inline-flex h-9 items-center justify-center rounded-full bg-emerald px-4 text-sm font-medium text-background transition-colors hover:bg-emerald-hover sm:h-10 sm:px-5"
              >
                Start Free Trial
              </Link>
            </>
          )}
        </nav>

        {/* Mobile hamburger — same nav items collapsed into a sheet. */}
        <div className="sm:hidden">
          <SiteHeaderMobileMenu isAuthed={isAuthed} />
        </div>
      </div>
    </header>
  );
}
