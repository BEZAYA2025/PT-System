"use client";

import { motion, useReducedMotion } from "framer-motion";

interface Props {
  tour?: string;
  delay?: number;
  children: React.ReactNode;
}

/**
 * Lightweight wrapper that fades a dashboard section in on first mount.
 * - Forwards data-tour so SpotlightTour selectors keep working.
 * - Honours prefers-reduced-motion via useReducedMotion (no animation).
 * - Fires once on hydration; doesn't re-trigger on scroll.
 */
export function MotionSection({ tour, delay = 0, children }: Props) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div data-tour={tour}>{children}</div>;
  }

  return (
    <motion.div
      data-tour={tour}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
