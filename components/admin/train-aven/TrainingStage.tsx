"use client";

// TrainingStage — iteration 2: the goosebumps moment.
//
// When Paul hits "Start training" the room transforms. The avatar
// blooms larger and brighter, the caption narrates the awakening,
// chart frames glide in with z-depth and parallax (different sizes
// for foreground vs background, different durations + delays so
// the eye reads cascade-with-perspective, not five identical
// tiles), the methodology chips ignite in sequence like an
// instrument cockpit booting up, and the room settles into a
// focused, ready state with the voice console live at the centre.
//
// Choreography is pure visual / mock — the captions, chart frames
// and methodology badges will bind to real bridge-chart pulls +
// methodology snapshots in a follow-up. The Show is the scaffold.

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IconArrowsMinimize,
  IconChartCandle,
  IconMicrophone,
  IconPlayerStopFilled,
} from "@tabler/icons-react";
import { AvenStage, type AvenStageState } from "./AvenStage";

type ShowPhase =
  | "intro" // 0.0s — AvenStage awakening
  | "charts" // 0.9s — TF charts cascade in with z-depth
  | "methodik" // 2.2s — methodology badges ignite in sequence
  | "ready"; // 3.4s — settle, voice console active

const TIMEFRAMES = ["5m", "15m", "1H", "4H", "Daily"] as const;
const METHODIK = [
  "Fibs",
  "Rays",
  "EMAs",
  "RSI",
  "MACD",
  "Vector Candles",
] as const;

const PHASE_TIMING_MS: Record<ShowPhase, number> = {
  intro: 0,
  charts: 900,
  methodik: 2200,
  ready: 3400,
};

// Per-chart parallax/depth metadata. Outer charts (5m / Daily) sit
// further back — slightly smaller, more blurred, slower entrance
// — while the middle (1H) sits forward, sharp and prompt. Reads as
// a cascade with perspective rather than five identical tiles.
const CHART_DEPTH = [
  { y: 32, blur: 2, scale: 0.88, opacityRest: 0.55, delay: 0.0 },
  { y: 22, blur: 1, scale: 0.94, opacityRest: 0.75, delay: 0.12 },
  { y: 14, blur: 0, scale: 1.0, opacityRest: 1.0, delay: 0.24 }, // 1H — hero
  { y: 22, blur: 1, scale: 0.94, opacityRest: 0.75, delay: 0.36 },
  { y: 32, blur: 2, scale: 0.88, opacityRest: 0.55, delay: 0.48 },
];

interface Props {
  onExit: () => void;
  onVoiceTurn?: (audio: Blob) => void | Promise<void>;
}

export function TrainingStage({ onExit, onVoiceTurn }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<ShowPhase>("intro");
  const [avenState, setAvenState] = useState<AvenStageState>("awakening");

  useEffect(() => {
    if (reduce) {
      setPhase("ready");
      setAvenState("ready");
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => setPhase("charts"), PHASE_TIMING_MS.charts),
      setTimeout(() => setPhase("methodik"), PHASE_TIMING_MS.methodik),
      setTimeout(() => {
        setPhase("ready");
        setAvenState("ready");
      }, PHASE_TIMING_MS.ready),
    );
    return () => timers.forEach(clearTimeout);
  }, [reduce]);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="relative flex w-full flex-col items-center justify-start px-4 pt-12 pb-10 sm:px-8 sm:pt-16"
      aria-label="Training stage"
    >
      {/* Exit affordance — quiet, top-right of the room. Leaving
          the stage should feel as deliberate as entering it. */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit training mode"
        className="absolute right-5 top-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm transition-colors hover:border-emerald/40 hover:text-foreground"
      >
        <IconArrowsMinimize size={11} stroke={1.75} aria-hidden />
        Exit
      </button>

      <AvenStage state={avenState} size={160} hideLabel />

      {/* Caption layer — the narration. One line at a time, fades
          through the phases. Mono small-caps reads as system
          narration rather than a chat message. */}
      <div className="mt-8 h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.4 }}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-emerald/80"
          >
            {phase === "intro" && "Initialising training context"}
            {phase === "charts" && "Pulling your charts"}
            {phase === "methodik" && "Loading methodology"}
            {phase === "ready" && "Ready when you are"}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Chart cascade — five timeframe frames that glide in with
          parallax. The middle (1H) is the hero, larger and sharp;
          the outer pair sit back, smaller, blurred, drifting in
          slower. Reads as depth — not a flat row of tiles. */}
      <div className="mt-12 flex w-full max-w-3xl items-end justify-center gap-3 sm:gap-4">
        {TIMEFRAMES.map((tf, i) => {
          const d = CHART_DEPTH[i];
          return (
            <motion.div
              key={tf}
              initial={{
                opacity: 0,
                y: 40,
                scale: d.scale * 0.85,
                filter: `blur(${d.blur + 4}px)`,
              }}
              animate={
                phase === "intro"
                  ? {
                      opacity: 0,
                      y: 40,
                      scale: d.scale * 0.85,
                      filter: `blur(${d.blur + 4}px)`,
                    }
                  : {
                      opacity: d.opacityRest,
                      y: d.y,
                      scale: d.scale,
                      filter: `blur(${d.blur}px)`,
                    }
              }
              transition={{
                duration: 0.9,
                delay: phase === "intro" ? 0 : d.delay,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex aspect-[4/3] w-[18%] min-w-[88px] flex-col justify-between rounded-xl border border-emerald/15 bg-gradient-to-b from-surface/70 to-background/90 p-3 shadow-[0_8px_30px_-12px_rgba(16,185,129,0.4)]"
            >
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald/70">
                {tf}
              </span>
              <IconChartCandle
                size={22}
                stroke={1.5}
                className="self-end text-emerald/80"
                aria-hidden
              />
            </motion.div>
          );
        })}
      </div>

      {/* Methodology row — six chips. Each gets a sequenced bright
          flash during the methodik phase, like cockpit instruments
          booting up one by one. Once ignited they hold a steady
          dim emerald so the founder sees the cockpit ready. */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {METHODIK.map((label, i) => (
          <motion.span
            key={label}
            initial={{
              opacity: 0.25,
              borderColor: "rgba(255,255,255,0.05)",
              color: "rgba(148,163,184,0.6)",
              boxShadow: "0 0 0 rgba(16,185,129,0)",
            }}
            animate={
              phase === "methodik"
                ? {
                    opacity: [0.25, 1, 0.85],
                    borderColor: [
                      "rgba(16,185,129,0)",
                      "rgba(16,185,129,0.8)",
                      "rgba(16,185,129,0.35)",
                    ],
                    color: [
                      "rgba(148,163,184,0.6)",
                      "rgba(167,243,208,1)",
                      "rgba(110,231,183,0.95)",
                    ],
                    boxShadow: [
                      "0 0 0 rgba(16,185,129,0)",
                      "0 0 24px rgba(16,185,129,0.6)",
                      "0 0 8px rgba(16,185,129,0.2)",
                    ],
                  }
                : phase === "ready"
                  ? {
                      opacity: 0.85,
                      borderColor: "rgba(16,185,129,0.35)",
                      color: "rgba(110,231,183,0.95)",
                      boxShadow: "0 0 8px rgba(16,185,129,0.2)",
                    }
                  : {
                      opacity: 0.25,
                      borderColor: "rgba(255,255,255,0.05)",
                      color: "rgba(148,163,184,0.6)",
                      boxShadow: "0 0 0 rgba(16,185,129,0)",
                    }
            }
            transition={{
              duration: 1.0,
              delay: phase === "methodik" ? 0.14 * i : 0,
              ease: "easeInOut",
            }}
            className="rounded-full border bg-black/30 px-3.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] backdrop-blur-sm"
          >
            {label}
          </motion.span>
        ))}
      </div>

      {/* Voice console — materialises only when the show settles.
          The single big mic in the centre of the room is the
          invitation: step up and speak. */}
      <AnimatePresence>
        {phase === "ready" && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            <VoiceConsole
              onTurn={onVoiceTurn}
              onListeningChange={(listening) =>
                setAvenState(listening ? "listening" : "ready")
              }
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
              Tap to speak · tap again to send
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

// VoiceConsole — toggle mic (tap-to-record / tap-to-stop+send).
// Wave-bars during recording give the founder a "the mic is alive"
// signal. Feeding the real MediaStream into a canvas analyser is a
// follow-up; for now the bars dance organically without claiming
// to be a real spectrum.
function VoiceConsole({
  onTurn,
  onListeningChange,
}: {
  onTurn?: (audio: Blob) => void | Promise<void>;
  onListeningChange?: (listening: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useState<{ current: MediaRecorder | null }>({
    current: null,
  })[0];
  const streamRef = useState<{ current: MediaStream | null }>({
    current: null,
  })[0];
  const chunksRef = useState<{ current: Blob[] }>({ current: [] })[0];

  const stop = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      onListeningChange?.(false);
      if (blob.size > 0 && onTurn) void onTurn(blob);
    };
    rec.stop();
  };

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      onListeningChange?.(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microphone access denied",
      );
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={recording ? stop : () => void start()}
        aria-label={recording ? "Stop and send" : "Start speaking"}
        className={[
          "relative inline-flex size-20 items-center justify-center rounded-full transition-colors shadow-[0_0_40px_-6px_rgba(16,185,129,0.6)]",
          recording
            ? "bg-red-500/[0.18] text-red-200 shadow-[0_0_40px_-6px_rgba(248,113,113,0.6)]"
            : "bg-emerald/[0.15] text-emerald hover:bg-emerald/[0.22]",
        ].join(" ")}
      >
        {recording ? (
          <IconPlayerStopFilled size={26} stroke={1.75} />
        ) : (
          <IconMicrophone size={26} stroke={1.75} />
        )}
        {recording && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-red-400/60"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </button>
      {recording && <WaveBars />}
      {error && <p className="text-xs text-amber-300">{error}</p>}
    </div>
  );
}

function WaveBars() {
  return (
    <div className="flex h-6 items-end gap-1">
      {[0, 0.12, 0.24, 0.36, 0.48].map((delay, i) => (
        <motion.span
          key={i}
          className="block w-1 rounded-full bg-red-300/70"
          animate={{ height: ["20%", "100%", "40%", "85%", "30%", "70%", "20%"] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
          }}
          style={{ height: "20%" }}
        />
      ))}
    </div>
  );
}
