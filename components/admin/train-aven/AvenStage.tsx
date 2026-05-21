"use client";

// AvenStage — the breathing presence at the centre of the studio.
//
// Iteration 2: this is no longer a tidy avatar in a ring. It's the
// light source of the room. Three concentric halo layers, each
// breathing at its own cadence, build a living aura that PAUL
// notices the moment he opens the tab. State changes ripple through
// all three layers — listening pulls the rings in tighter and
// faster, speaking pushes them wider and brighter, thinking slows
// the whole composition into a meditative breath.
//
// State ownership stays with the parent (TrainStudio / TrainingStage).
// This file is pure visual choreography.

import { motion, useReducedMotion } from "framer-motion";
import { AvenAvatar } from "@/components/dashboard/AvenAvatar";

export type AvenStageState =
  | "idle" // resting, slow breath
  | "awakening" // intro: outward bloom, halo intensify
  | "listening" // mic open, tight quick pulse
  | "thinking" // request in flight, slow deep breath
  | "speaking" // TTS playback, wide bright pulse
  | "ready"; // settled between turns, gentle steady glow

// Per-state breathing config — three layers, each with its own
// scale range and duration. Tuned so the layers never beat exactly
// in unison (avoids the "throbbing" feel) — outer halo is the
// slowest, inner ring is the snappiest.
const HALO_CONFIG: Record<
  AvenStageState,
  {
    outerScale: [number, number, number];
    outerDur: number;
    outerOpacity: [number, number, number];
    midScale: [number, number, number];
    midDur: number;
    midOpacity: [number, number, number];
    innerScale: [number, number, number];
    innerDur: number;
    innerOpacity: [number, number, number];
    coreGlow: string;
  }
> = {
  idle: {
    outerScale: [1, 1.04, 1],
    outerDur: 5.0,
    outerOpacity: [0.35, 0.55, 0.35],
    midScale: [1, 1.05, 1],
    midDur: 3.8,
    midOpacity: [0.5, 0.7, 0.5],
    innerScale: [1, 1.06, 1],
    innerDur: 2.8,
    innerOpacity: [0.55, 0.8, 0.55],
    coreGlow: "shadow-[0_0_60px_-10px_rgba(16,185,129,0.45)]",
  },
  awakening: {
    outerScale: [0.85, 1.18, 1.05],
    outerDur: 1.6,
    outerOpacity: [0.0, 0.9, 0.7],
    midScale: [0.9, 1.15, 1.0],
    midDur: 1.4,
    midOpacity: [0.0, 1.0, 0.85],
    innerScale: [0.92, 1.12, 1.0],
    innerDur: 1.2,
    innerOpacity: [0.0, 1.0, 0.9],
    coreGlow: "shadow-[0_0_90px_-8px_rgba(16,185,129,0.75)]",
  },
  listening: {
    outerScale: [1, 1.08, 1],
    outerDur: 2.4,
    outerOpacity: [0.45, 0.75, 0.45],
    midScale: [1, 1.09, 1],
    midDur: 1.8,
    midOpacity: [0.6, 0.9, 0.6],
    innerScale: [1, 1.1, 1],
    innerDur: 1.3,
    innerOpacity: [0.65, 1.0, 0.65],
    coreGlow: "shadow-[0_0_75px_-8px_rgba(16,185,129,0.6)]",
  },
  thinking: {
    outerScale: [1, 1.03, 1],
    outerDur: 6.5,
    outerOpacity: [0.4, 0.55, 0.4],
    midScale: [1, 1.04, 1],
    midDur: 4.8,
    midOpacity: [0.5, 0.65, 0.5],
    innerScale: [1, 1.05, 1],
    innerDur: 3.6,
    innerOpacity: [0.55, 0.75, 0.55],
    coreGlow: "shadow-[0_0_65px_-12px_rgba(16,185,129,0.5)]",
  },
  speaking: {
    outerScale: [1, 1.12, 1],
    outerDur: 1.4,
    outerOpacity: [0.6, 1.0, 0.6],
    midScale: [1, 1.14, 1],
    midDur: 1.1,
    midOpacity: [0.7, 1.0, 0.7],
    innerScale: [1, 1.16, 1],
    innerDur: 0.85,
    innerOpacity: [0.75, 1.0, 0.75],
    coreGlow: "shadow-[0_0_100px_-6px_rgba(16,185,129,0.85)]",
  },
  ready: {
    outerScale: [1, 1.05, 1],
    outerDur: 4.2,
    outerOpacity: [0.45, 0.65, 0.45],
    midScale: [1, 1.06, 1],
    midDur: 3.2,
    midOpacity: [0.55, 0.8, 0.55],
    innerScale: [1, 1.07, 1],
    innerDur: 2.4,
    innerOpacity: [0.6, 0.9, 0.6],
    coreGlow: "shadow-[0_0_70px_-8px_rgba(16,185,129,0.55)]",
  },
};

const STATE_LABEL: Record<AvenStageState, string> = {
  idle: "Standing by",
  awakening: "Waking",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
  ready: "Ready",
};

export function AvenStage({
  state,
  size = 96,
  hideLabel = false,
}: {
  state: AvenStageState;
  size?: number;
  /** Hide the state caption underneath — useful when the stage
   *  surfaces the phase elsewhere. */
  hideLabel?: boolean;
}) {
  const reduce = useReducedMotion();
  const cfg = HALO_CONFIG[state];
  // The aura reaches ~3× the avatar diameter at its widest. The
  // container reserves enough room so the outermost ring doesn't
  // get clipped at the listening / speaking peaks.
  const haloField = size * 3.2;

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative flex items-center justify-center"
        style={{ width: haloField, height: haloField }}
      >
        {/* Outer halo — a soft mist that bleeds far beyond the
            avatar. Heavy blur, low opacity, slow breath. This is
            the "atmosphere" layer that fills the room. */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-emerald/35 blur-[60px]"
          animate={
            reduce
              ? { scale: 1, opacity: cfg.outerOpacity[1] }
              : {
                  scale: cfg.outerScale,
                  opacity: cfg.outerOpacity,
                }
          }
          transition={{
            duration: cfg.outerDur,
            repeat: state === "awakening" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Middle halo — sharper than the outer, gives the aura
            its body. Medium blur, mid opacity, faster breath. */}
        <motion.span
          aria-hidden
          className="absolute rounded-full bg-emerald/30 blur-[28px]"
          style={{ width: size * 2.0, height: size * 2.0 }}
          animate={
            reduce
              ? { scale: 1, opacity: cfg.midOpacity[1] }
              : { scale: cfg.midScale, opacity: cfg.midOpacity }
          }
          transition={{
            duration: cfg.midDur,
            repeat: state === "awakening" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner ring — the crisp ring closest to the avatar.
            Reads as the "edge" of the aura but still feels like
            light, not a stroke. */}
        <motion.span
          aria-hidden
          className="absolute rounded-full border border-emerald/40 bg-emerald/15 blur-[6px]"
          style={{ width: size * 1.35, height: size * 1.35 }}
          animate={
            reduce
              ? { scale: 1, opacity: cfg.innerOpacity[1] }
              : { scale: cfg.innerScale, opacity: cfg.innerOpacity }
          }
          transition={{
            duration: cfg.innerDur,
            repeat: state === "awakening" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Avatar core — physical centre of the composition. The
            base AvenAvatar already breathes; wrapping in motion
            adds an entrance animation and a state-tied scale that
            pushes the core slightly when speaking / awakening. */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{
            scale:
              state === "speaking" ? 1.06 : state === "awakening" ? 1.04 : 1,
            opacity: 1,
          }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`relative rounded-full ${cfg.coreGlow}`}
        >
          <AvenAvatar size={size} online breath />
        </motion.div>
      </div>

      {!hideLabel && (
        <motion.p
          key={state}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-emerald/70"
        >
          {STATE_LABEL[state]}
        </motion.p>
      )}
    </div>
  );
}
