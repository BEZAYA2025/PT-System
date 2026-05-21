"use client";

// TrainingStage — the immersive "studio" view. Choreographs the
// ~3s opening cinematic (AvenStage awakens → charts cascade in →
// methodology glow → ready), then settles into the voice console
// where the founder can keep sparring.
//
// All choreography here is VISUAL/MOCK. The captions, timeframe
// chips and methodology badges are not (yet) tied to real backend
// data — they're the stage we'll wire up to the bridge-chart pull
// and methodology snapshot in a follow-up pass. For now the show
// IS the point: it has to land, feel deliberate, and make Paul
// want to step into it.

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
  | "intro" // 0.0s — AvenStage awakening, container fades in
  | "charts" // 0.7s — TF charts cascade
  | "methodik" // 1.9s — methodology badges glow
  | "ready"; // 2.9s — settle, voice console active

const TIMEFRAMES = ["5m", "15m", "1H", "4H", "Daily"] as const;
const METHODIK = [
  "Fibs",
  "Rays",
  "EMAs",
  "RSI",
  "MACD",
  "Vector Candles",
] as const;

// Phase timing — total ~3s. Each step yields enough room for the
// previous one to settle before the next starts.
const PHASE_TIMING_MS: Record<ShowPhase, number> = {
  intro: 0,
  charts: 700,
  methodik: 1900,
  ready: 2900,
};

interface Props {
  /** Called when the founder closes the stage and returns to
   *  Quick-Capture. */
  onExit: () => void;
  /** Called when the founder hits the mic to start a voice turn.
   *  Receives the recorded blob. */
  onVoiceTurn?: (audio: Blob) => void | Promise<void>;
}

export function TrainingStage({ onExit, onVoiceTurn }: Props) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<ShowPhase>("intro");
  const [avenState, setAvenState] = useState<AvenStageState>("awakening");

  // Choreograph the opening. Skips straight to "ready" when the
  // user prefers reduced motion so we don't dump an animation on
  // them they explicitly opted out of.
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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl border border-emerald/15 bg-gradient-to-b from-surface/40 via-background to-background p-8 sm:p-12"
      aria-label="Training stage"
    >
      {/* Exit affordance — quiet, top-right. Stage is opt-in;
          leaving it should feel as deliberate as entering. */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit training mode"
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:border-emerald/30 hover:text-foreground"
      >
        <IconArrowsMinimize size={11} stroke={1.75} aria-hidden />
        Exit
      </button>

      <div className="flex flex-col items-center gap-8">
        <AvenStage state={avenState} size={112} />

        {/* Caption layer — one line at a time, fades through the
            phases. The mono small-caps reads as a system narration
            rather than a chat message. */}
        <div className="h-6">
          <AnimatePresence mode="wait">
            <motion.p
              key={phase}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground"
            >
              {phase === "intro" && "Initialising training context"}
              {phase === "charts" && "Pulling your charts"}
              {phase === "methodik" && "Loading methodology"}
              {phase === "ready" && "Ready when you are"}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Chart cascade — 5 timeframe placeholders that glide in
            staggered. Each is a thin frame with the TF label; later
            this becomes the actual bridge-chart preview. */}
        <div className="grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-5">
          {TIMEFRAMES.map((tf, i) => (
            <motion.div
              key={tf}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={
                phase === "intro"
                  ? { opacity: 0, y: 16, scale: 0.96 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              transition={{
                duration: 0.5,
                delay: phase === "intro" ? 0 : 0.15 * i,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex aspect-[4/3] flex-col justify-between rounded-xl border border-border bg-surface/60 p-3"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {tf}
              </span>
              <IconChartCandle
                size={20}
                stroke={1.5}
                className="self-end text-emerald/60"
                aria-hidden
              />
            </motion.div>
          ))}
        </div>

        {/* Methodology row — 6 small chips. Each gets a brief
            emerald flash in sequence during the methodik phase. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {METHODIK.map((label, i) => (
            <motion.span
              key={label}
              initial={{
                opacity: 0.4,
                borderColor: "rgba(255,255,255,0.06)",
                color: "rgba(148,163,184,1)",
              }}
              animate={
                phase === "methodik" || phase === "ready"
                  ? {
                      opacity: 1,
                      borderColor: [
                        "rgba(16,185,129,0.0)",
                        "rgba(16,185,129,0.6)",
                        "rgba(16,185,129,0.25)",
                      ],
                      color: [
                        "rgba(148,163,184,1)",
                        "rgba(110,231,183,1)",
                        "rgba(148,163,184,1)",
                      ],
                    }
                  : { opacity: 0.4 }
              }
              transition={{
                duration: 0.9,
                delay:
                  phase === "methodik" ? 0.12 * i : 0,
                ease: "easeInOut",
              }}
              className="rounded-full border bg-background px-3 py-1 font-mono text-[10px] uppercase tracking-wider"
            >
              {label}
            </motion.span>
          ))}
        </div>

        {/* Voice console — appears when the show settles. The
            single big mic is the entry to the live conversation;
            the affordance reads as "step up and speak". */}
        <AnimatePresence>
          {phase === "ready" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="mt-2 flex flex-col items-center gap-3"
            >
              <VoiceConsole
                onTurn={onVoiceTurn}
                onListeningChange={(listening) =>
                  setAvenState(listening ? "listening" : "ready")
                }
              />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Tap to speak · tap again to send
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

// VoiceConsole — toggle mic (tap-to-record / tap-to-stop+send).
// Wave-bar visual while recording so the founder sees the mic is
// actually picking up audio (it's a confidence affordance, not a
// real-time analyser yet — feeding the live MediaStream into the
// canvas is a follow-up). Mocks the conversation tap when no
// onTurn prop is given.
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
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={recording ? stop : () => void start()}
        aria-label={recording ? "Stop and send" : "Start speaking"}
        className={[
          "relative inline-flex size-16 items-center justify-center rounded-full transition-colors",
          recording
            ? "bg-red-500/[0.18] text-red-200"
            : "bg-emerald/[0.14] text-emerald hover:bg-emerald/[0.20]",
        ].join(" ")}
      >
        {recording ? (
          <IconPlayerStopFilled size={22} stroke={1.75} />
        ) : (
          <IconMicrophone size={22} stroke={1.75} />
        )}
        {recording && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border border-red-400/60"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </button>
      {recording && <WaveBars />}
      {error && (
        <p className="text-xs text-amber-300">{error}</p>
      )}
    </div>
  );
}

// Decorative wave-bars — three columns with offset breath, gives
// the founder a "the mic is alive" signal without claiming to be a
// real spectrum analyser.
function WaveBars() {
  return (
    <div className="flex items-end gap-1 h-5">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.span
          key={i}
          className="block w-1 rounded-full bg-red-300/70"
          animate={{ height: ["20%", "100%", "40%", "80%", "20%"] }}
          transition={{
            duration: 1.1,
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
