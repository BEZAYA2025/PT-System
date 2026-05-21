"use client";

// AvenStage — the central avatar actor inside the Training Stage.
//
// Five visual states drive the same triangle glyph + ring composition;
// each state changes the halo intensity, the pulse rhythm, and the
// optional ambient particles. The discipline is Apple-keynote: softer
// breath, never spinning, never neon. The state is OWNED by the
// parent (TrainingStage) — this component is purely visual.

import { motion, useReducedMotion } from "framer-motion";
import { AvenAvatar } from "@/components/dashboard/AvenAvatar";

export type AvenStageState =
  | "idle" // resting, gentle breath
  | "awakening" // intro: scale-in + halo intensify
  | "listening" // input mic open, ring pulse picks up
  | "thinking" // request in flight, halo breathes faster
  | "speaking" // TTS playback, halo brightens steadily
  | "ready"; // back to resting after a turn

const STATE_HALO: Record<AvenStageState, string> = {
  idle: "bg-emerald/[0.06]",
  awakening: "bg-emerald/[0.18]",
  listening: "bg-emerald/[0.14]",
  thinking: "bg-emerald/[0.10]",
  speaking: "bg-emerald/[0.22]",
  ready: "bg-emerald/[0.08]",
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
}: {
  state: AvenStageState;
  size?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative flex items-center justify-center"
        style={{ width: size * 2.4, height: size * 2.4 }}
      >
        {/* Outer ambient halo — bleeds beyond the avatar for the
            "presence" feeling. Opacity comes from STATE_HALO; the
            scale animation is tied to the active state so listening
            and speaking feel distinct from idle. */}
        <motion.span
          aria-hidden
          className={`absolute inset-0 rounded-full blur-2xl ${STATE_HALO[state]}`}
          animate={
            reduce
              ? { scale: 1, opacity: 1 }
              : state === "speaking"
                ? { scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }
                : state === "listening"
                  ? { scale: [1, 1.04, 1], opacity: [0.6, 0.9, 0.6] }
                  : state === "thinking"
                    ? { scale: [1, 1.02, 1], opacity: [0.5, 0.7, 0.5] }
                    : state === "awakening"
                      ? { scale: [0.95, 1.08, 1], opacity: [0.4, 1, 0.85] }
                      : { scale: 1, opacity: 0.8 }
          }
          transition={{
            duration:
              state === "awakening"
                ? 1.2
                : state === "speaking"
                  ? 1.6
                  : state === "listening"
                    ? 2.0
                    : state === "thinking"
                      ? 2.6
                      : 3.2,
            repeat: state === "awakening" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Inner ring — crisper edge, lower opacity, faster cadence */}
        <motion.span
          aria-hidden
          className="absolute rounded-full border border-emerald/30"
          style={{ width: size * 1.6, height: size * 1.6 }}
          animate={
            reduce || state === "idle"
              ? { scale: 1, opacity: 0.35 }
              : { scale: [1, 1.05, 1], opacity: [0.3, 0.55, 0.3] }
          }
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <AvenAvatar size={size} online breath />
        </motion.div>
      </div>

      {/* State caption — quiet, mono, lets the avatar carry the
          presence. Reads at a glance without competing for attention. */}
      <motion.p
        key={state}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
      >
        {STATE_LABEL[state]}
      </motion.p>
    </div>
  );
}
