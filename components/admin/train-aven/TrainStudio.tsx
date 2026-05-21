"use client";

// TrainStudio — iteration 4. ONE page, ONE chatbox as constant.
//
// Architectural principle (Paul's call):
//   · Regular mode: quiet chatbox, Aven on standby (small chip in
//     the header). The page IS the chatbox.
//   · Training mode: SAME page. The header transforms into a wider
//     canvas where Aven wakes up, charts cascade in, methodology
//     ignites, voice console arrives — and the chatbox below stays
//     fully present, becomes part of the immersive context.
//   · The transition is a TRANSFORMATION of the same surface — no
//     routing, no replacement, no separate screen.
//
// Implementation:
//   · A single outer shell (rounded emerald card) always rendered.
//   · The shell's top region swaps between a compact header and the
//     TrainingStage canvas; everything below (chat scroll + input)
//     stays mounted across both modes.
//   · StudioAtmosphere overlays the whole shell only in training
//     mode — the room "ignites" on transformation, then quiets back
//     down when Paul exits.
//   · Conversation state (messages) is owned here, so turns from
//     either mode land in the same continuous transcript.

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
      // Client-side guard against the trivial 400 cases per VPS-CC's
      // contract: text must be 1-4000 chars, non-empty after trim.
      // Belt-and-braces — QuickCaptureBar already blocks the empty
      // submit, but a stray caller would otherwise round-trip just
      // to get a "text required" back.
      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > 4000) {
        setError(
          trimmed.length === 0
            ? "Message can't be empty."
            : "Message too long (max 4000 chars).",
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.localId === localId ? { ...m, status: "failed" as const } : m,
          ),
        );
        return;
      }
      setError(null);
      setThinking(true);
      setAvenState("thinking");
      try {
        const res = await fetch("/api/proxy/admin/aven/sparring-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // STRICT per VPS-CC contract: { text: <string> } only.
          // No `message` alias, no `founder_sparring` meta — extras
          // can trip the backend's strict validation and produce a
          // 400 "text required" even when text is in fact present.
          body: JSON.stringify({ text: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as {
          reply?: string;
          response?: string;
          content?: string;
          message?: string;
          detail?: string;
          error?: string;
          message_id?: string;
        } | null;
        if (!res.ok) {
          // Surface the backend's own error body so a 400 reads as
          // something diagnosable instead of just "HTTP 400". Try
          // every common field shape; fall back to the status code.
          const backendMsg =
            data?.message ??
            data?.detail ??
            data?.error ??
            `HTTP ${res.status}`;
          throw new Error(String(backendMsg));
        }
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
    <div className="relative flex h-[78vh] flex-col overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-br from-surface via-surface to-emerald/[0.05] shadow-[0_0_80px_-20px_rgba(16,185,129,0.4),0_8px_36px_-12px_rgba(0,0,0,0.5)]">
      {/* Atmospheric room — ignites only in training mode. Fades out
          when Paul exits back to the quiet chatbox. Pointer-events-
          none so it never blocks chat interactions. */}
      <AnimatePresence>
        {mode === "training" && (
          <motion.div
            key="atmosphere"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0"
          >
            <StudioAtmosphere state={displayState} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient halo — always present, gives the regular surface a
          subtle alive feel without competing with the chat. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 45%, transparent 70%)",
        }}
      />

      {/* Top region — transforms between a compact header (quick
          mode) and the training canvas (training mode). The chat
          stays mounted underneath either way. */}
      <AnimatePresence mode="wait" initial={false}>
        {mode === "quick" ? (
          <motion.header
            key="header"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="relative flex shrink-0 items-center justify-between border-b border-emerald/20 px-5 py-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="relative inline-flex size-7 items-center justify-center rounded-full bg-emerald/[0.12] text-[11px] font-semibold text-emerald">
                A
                {/* Status dot — solid emerald in idle/ready (alive),
                    amber when thinking. The wrapping span layers a
                    soft animate-ping ring under the dot so Aven reads
                    as actively present instead of statically "on" —
                    same trick the dashboard live-bar uses for its
                    SSE status. Ring is suppressed during thinking
                    so the amber state stands out from "live". */}
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 inline-flex size-2"
                >
                  {!thinking && (
                    <span
                      aria-hidden
                      className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
                      style={{ animationDuration: "2.2s" }}
                    />
                  )}
                  <span
                    className={[
                      "relative inline-flex size-2 rounded-full ring-2 ring-surface",
                      thinking ? "bg-amber-400" : "bg-emerald",
                    ].join(" ")}
                  />
                </span>
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-foreground">
                  Aven
                </span>
                <span
                  className={[
                    "font-mono text-[10px] uppercase tracking-[0.18em]",
                    thinking ? "text-amber-300/80" : "text-emerald/80",
                  ].join(" ")}
                >
                  {thinking ? "thinking…" : "live"}
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
          </motion.header>
        ) : (
          <motion.div
            key="canvas"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            // flex-1 means the canvas claims the room above the
            // chat; min-h-0 keeps it scrollable when content gets
            // tall.
            className="relative flex-1 min-h-0 overflow-hidden"
          >
            <TrainingStage
              onExit={() => {
                setMode("quick");
                setAvenState("idle");
              }}
              onVoiceTurn={handleVoiceTurn}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat scroll — ALWAYS rendered. In quick mode it gets flex-1
          and fills the page; in training mode it shrinks to a fixed
          band at the bottom so the canvas above gets room to
          breathe while the conversation stays continuously
          present. */}
      <div
        className={[
          "relative overflow-y-auto bg-background/40 px-5 py-5",
          mode === "quick" ? "flex-1" : "h-[24vh] shrink-0",
        ].join(" ")}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground/70">
              {mode === "quick"
                ? "Throw Aven a thought, or hit "
                : "The studio is live. Type or speak — "}
              <span className="font-medium text-emerald">
                {mode === "quick" ? "Start training" : "Aven is listening"}
              </span>
              {mode === "quick" ? " for a focused session." : "."}
            </p>
          </div>
        ) : (
          // userLabel="Du" — Paul ist der Lehrer im Founder-Sparring,
          // nicht ein "Member". showSource=false weil Sparring web-only
          // läuft, der Telegram/Web-Pill wäre nur Noise.
          <ChatBubbleList messages={messages} userLabel="Du" showSource={false} />
        )}
      </div>

      {/* Input strip — ALWAYS rendered. Same affordances in both
          modes (mic + camera + text + send). The chat affordance is
          the constant — voice console in the training canvas above
          is additive, not a replacement.
          bg-surface-elevated gives the strip a clean, slightly
          contrasting surface vs the chat scroll above (same trick
          the dashboard chat uses) so it reads as a defined input
          area instead of a dark blob with form-fields inside. */}
      <div className="relative shrink-0 border-t border-emerald/20 bg-surface-elevated px-5 py-3 sm:px-6 sm:py-3.5">
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
