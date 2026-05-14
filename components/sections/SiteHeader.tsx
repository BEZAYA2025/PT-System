import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAuthed = user !== null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 sm:h-16">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-foreground transition-colors hover:text-emerald sm:text-lg"
        >
          PT System
        </Link>

        <nav
          aria-label="Primary"
          className="flex items-center gap-1 sm:gap-3"
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
            <Link
              href="/signin"
              className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
