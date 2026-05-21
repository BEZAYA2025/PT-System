"use client";

// TrainStudio — the top-level Train-Aven workspace.
//
// Two modes share the same surface:
//   · Quick Capture (default): low-friction text / voice / image
//     drop. The QuickCaptureBar lives at the bottom; sent turns
//     stack above in the shared ChatBubbleList.
//   · Training (immersive): TrainingStage takes over the canvas
//     with the ~3s opening cinematic, then the voice console.
//     Exiting drops the founder back into Quick Capture with the
//     conversation history preserved.
//
// Sparring conversation persistence: turns the founder sends in
// either mode land in the same `messages` state, so the day-grouped
// transcript reads as one continuous record of the Train-Aven
// session.
//
// Backend wiring: /api/proxy/admin/aven/sparring-chat. The Show
// itself is still pure choreography — we'll bind it to the real
// bridge-chart / methodology snapshot once that lands.

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

// Mode of the studio surface — Quick is the default rest state.
type Mode = "quick" | "training";

// Message extends the shared shape so the same ChatBubbleList can
// render it. localId tracks optimistic founder messages until the
// server gives them a real message_id.
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
        // Flip the founder message from "sending" to "sent" and
        // append the reply in the same render pass.
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
      // For now we only send the text portion to the backend.
      // Audio + image attachments stack into the UI so the founder
      // sees them captured, but the multimodal wiring lands in a
      // follow-up — backend is being refactored in parallel.
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

      // Only call backend if there's text. Pure attachment turns are
      // recorded locally for now — backend will accept them once
      // the multimodal route lands.
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

  const handleVoiceTurn = useCallback(
    async (audio: Blob) => {
      // Voice turn from the training stage. Same envelope as a
      // capture-bar audio drop — recorded locally for now, will be
      // routed through STT once backend exposes the audio sparring
      // endpoint. The founder still sees the turn land in the
      // transcript so the conversation has continuity.
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
    },
    [],
  );

  return (
    <div className="space-y-6">
      {/* Header: a one-line intent statement plus a quiet "live"
          indicator so the founder always knows whether the studio
          is in Quick mode (avatar idle) or Training (active). */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Aven's classroom
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Quick capture for stray thoughts; training mode when you
            want a focused lesson.
          </p>
        </div>
      </header>

      {error && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      <AnimatePresence mode="wait">
        {mode === "training" ? (
          <motion.div
            key="training"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Quiet companion row — small avatar + transcript
                scroller. Sits above the capture bar so it reads
                like a contained workspace, not a chat-app. */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[120px_1fr]">
              <div className="flex justify-center pt-2 lg:pt-6">
                <AvenStage
                  state={thinking ? "thinking" : avenState}
                  size={56}
                />
              </div>
              <div className="min-h-[280px] rounded-2xl border border-border bg-surface/30 p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">
                        Studio at rest
                      </p>
                      <p className="mt-2 max-w-sm">
                        Drop a thought, ask Aven something, or step
                        into the training stage when you're ready to
                        teach.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[480px] overflow-y-auto sm:max-h-[420px]">
                    <ChatBubbleList messages={messages} />
                  </div>
                )}
              </div>
            </div>

            <QuickCaptureBar
              onSend={handleSend}
              onStartTraining={() => {
                setMode("training");
                setAvenState("awakening");
              }}
              busy={thinking}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
