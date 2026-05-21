"use client";

// TrainStudio — iteration 2.
//
// Paul opens the tab and lands in Aven's studio, not an admin panel.
// No "Train Aven" headline, no "classroom" subtitle. The avatar is
// the centrepiece, breathing inside an ambient emerald glow. The
// chat history sits below — quiet when empty, present when there's
// conversation to read. Capture bar floats at the bottom, generous,
// ready. "Start training" is the deliberate ritual entry into the
// immersive stage.
//
// Sparring conversation persists across mode switches — turns in
// either Quick or Training mode land in the same `messages` state
// so the day-grouped transcript reads as one continuous record.

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconAlertCircle } from "@tabler/icons-react";
import {
  ChatBubbleList,
  type ChatBubbleListMessage,
} from "@/components/dashboard/ChatBubbleList";
import {
  QuickCaptureBar,
  type CapturePayload,
} from "./QuickCaptureBar";
import { TrainingStage } from "./TrainingStage";
import { AvenStage, type AvenStageState } from "./AvenStage";
import { StudioAtmosphere } from "./StudioAtmosphere";

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

  const displayState = thinking ? "thinking" : avenState;

  return (
    // Full-bleed studio surface. Negative margins pull the room out
    // past the admin chrome padding so the atmosphere reaches the
    // section edges — the founder experiences a "room", not "another
    // card in the dashboard".
    <div className="relative -mx-4 sm:-mx-6 md:-mx-8">
      <div className="relative min-h-[78vh] overflow-hidden rounded-3xl">
        <StudioAtmosphere state={displayState} />

        <div className="relative z-10 flex min-h-[78vh] flex-col">
          <AnimatePresence mode="wait">
            {mode === "training" ? (
              <motion.div
                key="training"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-1"
              >
                <TrainingStage
                  onExit={() => {
                    setMode("quick");
                    setAvenState("idle");
                  }}
                  onVoiceTurn={handleVoiceTurn}
                />
              </motion.div>
            ) : (
              <motion.div
                key="quick"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-1 flex-col"
              >
                {/* Hero zone — avatar centred, generous breathing
                    space above and below. The studio reads as a
                    room with a single figure at its heart. */}
                <div className="flex flex-col items-center justify-center px-4 pt-14 sm:pt-20">
                  <AvenStage state={displayState} size={144} />
                </div>

                {/* Conversation strip — sits between the avatar and
                    the input. Empty state is a single quiet line so
                    the room doesn't feel cluttered when there's
                    nothing to show. */}
                <div className="mx-auto w-full max-w-3xl px-4 pt-10 sm:px-8">
                  {messages.length === 0 ? (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground/60"
                    >
                      The studio is yours
                    </motion.p>
                  ) : (
                    <div className="max-h-[44vh] overflow-y-auto rounded-2xl border border-white/[0.04] bg-black/20 p-5 backdrop-blur-sm">
                      <ChatBubbleList messages={messages} />
                    </div>
                  )}
                </div>

                {/* Capture bar — anchored to the bottom of the
                    studio room, generously padded so it reads as a
                    deliberate surface, not an afterthought. */}
                <div className="mt-auto px-4 pb-8 pt-10 sm:px-8 sm:pb-10">
                  <div className="mx-auto w-full max-w-3xl">
                    {error && (
                      <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
                        <IconAlertCircle
                          size={12}
                          stroke={1.75}
                          aria-hidden
                        />
                        {error}
                      </p>
                    )}
                    <QuickCaptureBar
                      onSend={handleSend}
                      onStartTraining={() => {
                        setMode("training");
                        setAvenState("awakening");
                      }}
                      busy={thinking}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
