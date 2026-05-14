import Link from "next/link";
import { Reveal } from "@/components/Reveal";

export function Status({ isAuthed = false }: { isAuthed?: boolean }) {
  return (
    <section id="status" className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Phase 1 is live. Beta opens soon.
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
            <p>
              PT System is being built in the open. Phase 1 (foundation) is
              deployed and operational. Phase 2 (member onboarding) is in
              active development.
            </p>
            <p>
              Beta access opens to waitlist members first. Subscription
              tiers — <span className="text-foreground">Aven Lite</span>{" "}
              (Standard) and{" "}
              <span className="text-foreground">Aven Unlimited</span> (VIP) —
              will be announced at launch.
            </p>
            {!isAuthed && <p>Join the waitlist to be among the first.</p>}
          </div>
        </Reveal>

        {!isAuthed && (
          <Reveal delay={0.2}>
            <div className="mt-10">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center justify-center rounded-full bg-emerald px-8 text-sm font-medium text-background transition-colors duration-200 hover:bg-emerald-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald"
              >
                Join the waitlist
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
