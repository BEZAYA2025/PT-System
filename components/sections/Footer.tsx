import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export async function Footer() {
  const user = await getCurrentUser();
  const isAuthed = user !== null;

  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:gap-10">
        <div className="grid gap-8 sm:grid-cols-3 sm:items-center">
          <p className="text-base font-semibold tracking-tight text-foreground">
            PT System
          </p>

          <div className="flex items-center justify-start sm:justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-emerald"
              />
              Phase 1 deployed · Phase 2 building
            </span>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground sm:justify-end"
          >
            <Link
              href="/pricing"
              className="transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            {isAuthed ? (
              <>
                <Link
                  href="/dashboard"
                  className="transition-colors hover:text-foreground"
                >
                  Dashboard
                </Link>
                <SignOutButton
                  label="Sign out"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                />
              </>
            ) : (
              <Link
                href="/signin"
                className="transition-colors hover:text-foreground"
              >
                Sign in
              </Link>
            )}
            <Link
              href="/privacy"
              className="transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-foreground"
            >
              Terms
            </Link>
            <a
              href="mailto:hello@ptsystem.ai"
              className="transition-colors hover:text-foreground"
            >
              Contact
            </a>
          </nav>
        </div>

        <p className="text-xs text-muted-foreground">© 2026 PT System</p>
      </div>
    </footer>
  );
}
