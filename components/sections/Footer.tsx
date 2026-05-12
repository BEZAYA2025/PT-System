import Link from "next/link";

export function Footer() {
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
            className="flex items-center gap-6 text-sm text-muted-foreground sm:justify-end"
          >
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
