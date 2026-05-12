"use client";

import { useId } from "react";
import { useReducedMotion } from "framer-motion";

type Direction = "left-to-right" | "right-to-left" | "left-to-center" | "center-to-left" | "right-to-center" | "center-to-right";

type Props = {
  direction: Direction;
};

// Bezier paths between adjacent zigzag cards. Each path starts near the
// bottom of one card and ends near the top of the next; the SVG itself
// fills the connector slot, and the path coordinates use a 200×120 viewBox.
const PATHS: Record<Direction, string> = {
  "left-to-right": "M 20 0 C 20 80, 180 40, 180 120",
  "right-to-left": "M 180 0 C 180 80, 20 40, 20 120",
  "left-to-center": "M 20 0 C 20 80, 100 40, 100 120",
  "center-to-left": "M 100 0 C 100 80, 20 40, 20 120",
  "right-to-center": "M 180 0 C 180 80, 100 40, 100 120",
  "center-to-right": "M 100 0 C 100 80, 180 40, 180 120",
};

// Three traveling dots staggered for a continuous-stream effect.
const DOT_BEGINS = ["0s", "1s", "2s"] as const;

export function DataFlowConnector({ direction }: Props) {
  const reduce = useReducedMotion();
  const pathId = useId();

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 120"
      preserveAspectRatio="none"
      className="hidden h-24 w-full md:block"
    >
      <path
        id={pathId}
        d={PATHS[direction]}
        fill="none"
        stroke="#1f1f1f"
        strokeWidth="1"
      />
      {!reduce &&
        DOT_BEGINS.map((begin) => (
          <circle key={begin} r="2.5" fill="#10b981" opacity="0.9">
            <animateMotion
              dur="3s"
              repeatCount="indefinite"
              begin={begin}
              rotate="auto"
            >
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        ))}
    </svg>
  );
}
