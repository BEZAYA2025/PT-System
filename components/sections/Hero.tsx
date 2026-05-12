"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export function Hero() {
  const reduce = useReducedMotion();

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald/[0.04] blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <motion.h1
          {...fade(0.05)}
          className="text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-7xl md:text-8xl"
        >
          Meet Aven.
        </motion.h1>

        <motion.p
          {...fade(0.2)}
          className="mt-6 text-2xl font-normal text-muted-foreground sm:text-3xl md:text-4xl"
        >
          Paul&apos;s AI trading mentor.
        </motion.p>

        <motion.p
          {...fade(0.35)}
          className="mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-[1.7]"
        >
          Trained on the Wave Riding Method. Aware of your trades in real time.
          Available 24/7. Backed by transparent, live results.
        </motion.p>

        <motion.div
          {...fade(0.5)}
          className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
        >
          <Link
            href="/signup"
            className="inline-flex h-12 items-center justify-center rounded-full bg-emerald px-8 text-sm font-medium text-background transition-colors duration-200 hover:bg-emerald-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald"
          >
            Join the waitlist
          </Link>
          <Link
            href="#what-is"
            className="text-sm font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Read what Aven is →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
