"use client";

// StudioAtmosphere — the "room" behind the avatar.
//
// Three layers stacked into a single absolute-fill element:
//   · Radial emerald glow centred on the avatar (so the avatar
//     reads as the light source of the room)
//   · Subtle viewport vignette so the edges feel deeper than the
//     middle
//   · Three very slowly drifting light orbs (60–90s loops) — kept
//     low-opacity + heavily blurred so they read as ambient mist,
//     not visible "moving things"
//
// Pure decoration — sits behind the studio content with pointer-
// events:none. Driven by the active state so the room itself
// reacts subtly to what Aven is doing (brighter when speaking,
// dimmer when idle).

import { motion, useReducedMotion } from "framer-motion";
import type { AvenStageState } from "./AvenStage";

const STATE_INTENSITY: Record<AvenStageState, number> = {
  idle: 0.6,
  awakening: 1.0,
  listening: 0.85,
  thinking: 0.65,
  speaking: 1.0,
  ready: 0.8,
};

export function StudioAtmosphere({ state }: { state: AvenStageState }) {
  const reduce = useReducedMotion();
  const intensity = STATE_INTENSITY[state];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Base wash — replaces the flat black with a soft top-down
          gradient so the canvas feels like a room with a horizon,
          not a void. */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070a09] via-background to-[#040605]" />

      {/* Primary radial glow — centred on the avatar's expected
          position. Intensity scales with the active state so the
          room itself feels Aven's mood. */}
      <motion.div
        className="absolute inset-0"
        animate={
          reduce
            ? { opacity: intensity }
            : {
                opacity: [intensity * 0.85, intensity, intensity * 0.85],
              }
        }
        transition={{
          duration: state === "speaking" ? 2.0 : 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 38%, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.06) 40%, transparent 70%)",
        }}
      />

      {/* Vignette — pulls the corners darker than the centre. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Ambient drift orbs — three soft blobs that very slowly
          pan across the canvas. Heavy blur + low opacity = mist,
          not "particles". Long durations (60–90s) and offset
          delays so the motion is felt, not seen. */}
      {!reduce && (
        <>
          <motion.span
            className="absolute size-[480px] rounded-full bg-emerald/[0.08] blur-[100px]"
            style={{ top: "-10%", left: "-15%" }}
            animate={{
              x: [0, 80, -40, 0],
              y: [0, 60, 30, 0],
              opacity: [0.4, 0.7, 0.5, 0.4],
            }}
            transition={{ duration: 78, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute size-[560px] rounded-full bg-emerald/[0.06] blur-[120px]"
            style={{ bottom: "-20%", right: "-10%" }}
            animate={{
              x: [0, -70, 30, 0],
              y: [0, -50, -20, 0],
              opacity: [0.3, 0.6, 0.45, 0.3],
            }}
            transition={{
              duration: 92,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 6,
            }}
          />
          <motion.span
            className="absolute size-[360px] rounded-full bg-emerald/[0.05] blur-[90px]"
            style={{ top: "30%", right: "20%" }}
            animate={{
              x: [0, -40, 20, 0],
              y: [0, 30, -10, 0],
              opacity: [0.35, 0.55, 0.4, 0.35],
            }}
            transition={{
              duration: 64,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 14,
            }}
          />
        </>
      )}
    </div>
  );
}
