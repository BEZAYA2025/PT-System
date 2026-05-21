"use client";

// TrainStudio — iteration 3.
//
// Two distinct modes, deliberately different in feel:
//
//   · NORMAL (default): a quiet, ordinary chatbox. Small Aven chip in
//     the header, full chat history in the middle, capture bar with a
//     send arrow on the right. No big halo, no atmospheric glow — the
//     emerald shows up only as accent (the chip dot, the send button).
//     The point is short, casual back-and-forth with Aven, nothing
//     more.
//
//   · TRAINING: tapped via the deliberate "Start training" button at
//     the top-right. ALL the wow — full-bleed atmosphere, big breathing
//     avatar, parallax charts, methodology ignition, voice waveform —
//     lives here. The transition from Normal → Training is the
//     goosebumps moment: the quiet chatbox gives way to the stage.
//
// Sparring conversation persists across the mode switch — turns in
// either mode land in the same `messages` state.

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  IconAlertCircle,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import {
  ChatBubbleList,
  type ChatBubbleListMessage,
} from "@/components/dashboard/ChatBubbleList";
import {
  QuickCaptureBar,
  type CapturePayload,
} from "./QuickCaptureBar";
import { TrainingStage } from "./TrainingStage";
import { type AvenStageState } from "./AvenStage";

type Mode = "quick" | "training";

interface StudioMessage extends ChatBubbleListMessage {
  localId?: string;
  status?: "sending" | "sent" | "failed";
}

export function TrainStudio() {
  const [mode, setMode] = useState<Mode>("quick");
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [avenState, setAvenState] = useState<AvenStageState>("idle");
  const [error, setError] = useState<string | null>(null);

  const sendToBackend = useCallback(
    async (text: string, localId: string) => {
      setError(null);
      setThinking(true);
      setAvenState("thinking");
      try {
        const res = await fetch("/api/proxy/admin/aven/sparring-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, founder_sparring: true }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json().catch(() => null)) as {
          reply?: string;
          response?: string;
          content?: string;
          message_id?: string;
        } | null;
        const reply =
          data?.reply ??
          data?.response ??
          data?.content ??
          "(no reply)";
        const replyMsg: StudioMessage = {
          id: data?.message_id ?? `aven-${Date.now()}`,
          role: "aven",
          content: reply,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [
          ...prev.map((m) =>
            m.localId === localId ? { ...m, status: "sent" as const } : m,
          ),
          replyMsg,
        ]);
        setAvenState("ready");
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Sparring endpoint unreachable";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.localId === localId ? { ...m, status: "failed" as const } : m,
          ),
        );
        setAvenState("idle");
      } finally {
        setThinking(false);
      }
    },
    [],
  );

  const handleSend = useCallback(
    async (payload: CapturePayload) => {
      const previewBits: string[] = [];
      if (payload.text) previewBits.push(payload.text);
      if (payload.audio)
        previewBits.push(
          `(voice note · ${Math.round(payload.audio.size / 1024)}KB)`,
        );
      if (payload.image)
        previewBits.push(`(image · ${payload.image.name})`);
      const localId = `local-${Date.now()}`;
      const localMsg: StudioMessage = {
        localId,
        id: localId,
        role: "user",
        content: previewBits.join(" "),
        created_at: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, localMsg]);

      if (payload.text) {
        await sendToBackend(payload.text, localId);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.localId === localId ? { ...m, status: "sent" as const } : m,
          ),
        );
      }
    },
    [sendToBackend],
  );

  const handleVoiceTurn = useCallback(async (audio: Blob) => {
    const localId = `voice-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        localId,
        id: localId,
        role: "user",
        content: `(voice turn · ${Math.round(audio.size / 1024)}KB)`,
        created_at: new Date().toISOString(),
        status: "sent",
      },
    ]);
  }, []);

  // Training mode owns the full-bleed atmospheric stage on its own.
  // It returns a self-contained immersive surface so the Normal-mode
  // chrome below is not rendered behind it.
  if (mode === "training") {
    return (
      <div className="relative -mx-4 sm:-mx-6 md:-mx-8">
        <AnimatePresence mode="wait">
          <motion.div
            key="training"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex min-h-[78vh]"
          >
            <TrainingStage
              onExit={() => {
                setMode("quick");
                setAvenState("idle");
              }}
              onVoiceTurn={handleVoiceTurn}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // NORMAL mode — a normal chat surface. Quiet, complete, functional.
  return (
    <div className="flex h-[78vh] flex-col rounded-2xl border border-border bg-surface/40">
      {/* Header — small Aven chip on the left, Start-Training on the
          right. The header is the only place the founder can launch
          the immersive session, so it's deliberately separated from
          the input strip. */}
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-emerald/[0.12] text-[11px] font-semibold text-emerald">
            A
            <span
              className={[
                "absolute -bottom-0.5 -right-0.5 size-2 rounded-full ring-2 ring-surface",
                thinking
                  ? "bg-amber-400"
                  : avenState === "ready"
                    ? "bg-emerald"
                    : "bg-emerald/60",
              ].join(" ")}
              aria-hidden
            />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">Aven</span>
            <span className="text-[11px] text-muted-foreground">
              {thinking
                ? "thinking…"
                : avenState === "ready"
                  ? "ready"
                  : "online"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setMode("training");
            setAvenState("awakening");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald transition-colors hover:bg-emerald/[0.14]"
        >
          <IconPlayerPlayFilled size={11} stroke={1.5} />
          Start training
        </button>
      </header>

      {/* Chat scroll — fills the available space. Empty state is a
          quiet centred line so the box doesn't read as broken when
          there's nothing yet. */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground/70">
              Throw Aven a thought, or hit{" "}
              <span className="font-medium text-emerald">Start training</span>{" "}
              for a focused session.
            </p>
          </div>
        ) : (
          <ChatBubbleList messages={messages} />
        )}
      </div>

      {/* Input strip — bottom anchored, normal chatbox affordances. */}
      <div className="border-t border-border px-5 py-4">
        {error && (
          <p className="mb-2 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            {error}
          </p>
        )}
        <QuickCaptureBar onSend={handleSend} busy={thinking} />
      </div>
    </div>
  );
}
