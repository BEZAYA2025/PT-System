"use client";

// TrainStudio — iteration 5. ONE page, ONE chatbox, persistent history.
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
// Persistence + dedup model (ADMIN_API_SPEC §30):
//   · On mount, GET /api/proxy/admin/aven/conversations seeds the
//     transcript from the backend store — reload-safe.
//   · POST /api/proxy/admin/aven/sparring-chat returns user_message
//     + aven_message as full blocks. Both go straight into state;
//     no second fetch.
//   · Optimistic local user-bubble (temp-id) is reconciled with the
//     real user_message when the response lands — the local row is
//     REPLACED in place, not appended-alongside.
//   · A dedupRef Set tracks every real message_id we've absorbed.
//     History + live blocks both check it so duplicates never reach
//     state.
//
// Voice → STT:
//   · QuickCaptureBar records the audio; its onTranscribe prop
//     uploads to /api/proxy/admin/aven/sparring-stt, gets back
//     transcript text, and DOES NOT auto-send. The transcript lands
//     in the textarea for Paul to verify/edit (Whisper mangles
//     trading jargon — EMA → "Ehema"), then he submits like any
//     other text turn.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconAlertCircle, IconPlayerPlayFilled } from "@tabler/icons-react";
import { ChatBubbleList } from "@/components/dashboard/ChatBubbleList";
import { QuickCaptureBar, type CapturePayload } from "./QuickCaptureBar";
import { TrainingStage } from "./TrainingStage";
import { type AvenStageState } from "./AvenStage";
import { StudioAtmosphere } from "./StudioAtmosphere";
import {
  newLocalId,
  shapeHistoryResponse,
  shapeSparringMessage,
  type SparringChatResponse,
  type SttResponse,
  type StudioMessage,
} from "@/lib/sparring";

type Mode = "quick" | "training";

// History request limit. Backend caps at 200; keeping it here so
// the wire-shape stays explicit in the URL.
const HISTORY_LIMIT = 200;

interface Props {
  /** Founder id used as ?member_id in the history fetch. Server-
   *  side rendered into the page so the client never has to guess
   *  who "self" is. */
  founderId: string;
}

export function TrainStudio({ founderId }: Props) {
  const [mode, setMode] = useState<Mode>("quick");
  const [messages, setMessages] = useState<StudioMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [avenState, setAvenState] = useState<AvenStageState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Dedup set of REAL backend message ids. Optimistic temp-ids stay
  // out of this set — they get reconciled to a real id (and added
  // here) when the sparring-chat response lands.
  const dedupRef = useRef<Set<string>>(new Set());

  // Auto-scroll plumbing — mirror of the dashboard AvenChat pattern.
  // scrollRef points at the chat-list container; lastBottomKeyRef
  // tracks the id (or localId) of the most-recent bubble we've
  // already scrolled to, so we ONLY scroll when a NEW bottom row
  // arrives — re-renders that don't change the tail (status flips,
  // userLabel updates) don't yank Paul's scroll position.
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastBottomKeyRef = useRef<string | null>(null);

  // Display name to render under user-side bubbles. Sourced from
  // the first user message that carries a user_display_name (either
  // history seed or live response). Falls back to "Du" until the
  // backend has supplied one.
  const [userDisplayName, setUserDisplayName] = useState<string | null>(null);
  const userLabel = userDisplayName ?? "Du";

  // ---------------------------------------------------------------
  // History fetch on mount — reload-persistence.
  //
  // Surfacing strategy: on HTTP error OR shape-mismatch (response
  // parses but yields zero messages despite a non-empty backend
  // payload), set `error` so Paul sees what's failing instead of an
  // empty chat with no explanation. Console.error keeps a copy for
  // the deploy logs / devtools network trace.
  // ---------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // ADMIN_API_SPEC §30: member_id is required, even when the
        // requester IS the member (the backend's authorization layer
        // matches member_id against the bearer's user id and returns
        // an empty set if it can't bind the two).
        const url = `/api/proxy/admin/aven/conversations?member_id=${encodeURIComponent(
          founderId,
        )}&order=asc&limit=${HISTORY_LIMIT}`;
        const res = await fetch(url, { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          console.error(
            "[TrainStudio] history HTTP non-ok",
            res.status,
            body.slice(0, 240),
          );
          setError(
            `History laden fehlgeschlagen · HTTP ${res.status}${
              body ? ` · ${body.slice(0, 120)}` : ""
            }`,
          );
          return;
        }
        const data = await res.json().catch(() => null);
        const { messages: hist, user_display_name } = shapeHistoryResponse(data);
        if (cancelled) return;
        if (hist.length === 0 && data) {
          // Backend returned 200 but our shaper extracted nothing.
          // Most likely a response-shape drift. Dump a preview so
          // we can adjust the shaper instead of staring at an empty
          // chat.
          console.warn(
            "[TrainStudio] history shape-mismatch — 200 but 0 messages",
            JSON.stringify(data).slice(0, 240),
          );
        }
        for (const m of hist) dedupRef.current.add(m.id);
        setMessages(hist);
        if (user_display_name) setUserDisplayName(user_display_name);
      } catch (err) {
        console.error("[TrainStudio] history fetch failed", err);
        setError(
          `History laden fehlgeschlagen · ${
            err instanceof Error ? err.message : "unknown"
          }`,
        );
      } finally {
        if (!cancelled) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [founderId]);

  // ---------------------------------------------------------------
  // Send a text turn → sparring-chat → push BOTH returned blocks.
  // Reconciles the optimistic local user-bubble (localId) with the
  // real user_message in the response — same role + content match
  // → in-place replace, otherwise append.
  // ---------------------------------------------------------------
  const sendToBackend = useCallback(
    async (text: string, localId: string) => {
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
          // Extras can trip the backend's strict validation and
          // produce a 400 "text required" even when text is present.
          body: JSON.stringify({ text: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as
          | (Partial<SparringChatResponse> & {
              message?: string;
              detail?: string;
              error?: string;
            })
          | null;
        if (!res.ok) {
          const backendMsg =
            data?.message ?? data?.detail ?? data?.error ?? `HTTP ${res.status}`;
          throw new Error(String(backendMsg));
        }

        const userBlock = shapeSparringMessage(data?.user_message);
        const avenBlock = shapeSparringMessage(data?.aven_message);

        if (!userBlock || !avenBlock) {
          // Backend should always emit both blocks per §30. If
          // either is missing it's a contract violation worth
          // surfacing in-line instead of silently dropping.
          throw new Error(
            "Sparring response missing user_message / aven_message block",
          );
        }

        // Pick up canonical display name if this is the first time
        // we see it.
        if (userBlock.user_display_name && !userDisplayName) {
          setUserDisplayName(userBlock.user_display_name);
        }

        setMessages((prev) => {
          let next = prev;

          // Reconcile the optimistic local row with the real
          // user_message: if a localId row still exists, replace
          // it in place with the server-confirmed shape (keeping
          // its visual position in the transcript). Otherwise (no
          // optimistic row found — e.g. recovered from a stale
          // tab), filter any stale duplicates by id and append.
          if (dedupRef.current.has(userBlock.id)) {
            next = next.filter((m) => m.localId !== localId);
          } else {
            dedupRef.current.add(userBlock.id);
            const idx = next.findIndex((m) => m.localId === localId);
            if (idx !== -1) {
              next = next.slice();
              next[idx] = { ...userBlock, status: "sent" };
            } else {
              next = [...next, { ...userBlock, status: "sent" }];
            }
          }

          // Append the aven_message block, dedup-guarded.
          if (!dedupRef.current.has(avenBlock.id)) {
            dedupRef.current.add(avenBlock.id);
            next = [...next, avenBlock];
          }

          return next;
        });
        setAvenState("ready");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Sparring endpoint unreachable";
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
    [userDisplayName],
  );

  // ---------------------------------------------------------------
  // QuickCaptureBar submit. For text payloads we push an optimistic
  // bubble + fire the sparring-chat round-trip. Image-only / audio-
  // only payloads (no text) are left as preview-only for now until
  // backend wires those up.
  // ---------------------------------------------------------------
  const handleSend = useCallback(
    async (payload: CapturePayload) => {
      const previewBits: string[] = [];
      if (payload.text) previewBits.push(payload.text);
      if (payload.image)
        previewBits.push(`(image · ${payload.image.name})`);
      if (payload.audio)
        previewBits.push(
          `(voice note · ${Math.round(payload.audio.size / 1024)}KB)`,
        );

      const localId = newLocalId("user");
      const optimistic: StudioMessage = {
        localId,
        id: localId,
        role: "user",
        content: previewBits.join(" "),
        created_at: new Date().toISOString(),
        status: "sending",
      };
      setMessages((prev) => [...prev, optimistic]);

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

  // ---------------------------------------------------------------
  // Voice → STT. QuickCaptureBar calls this with the recorded blob
  // when its mic stops. We upload to the multipart proxy and return
  // the transcript text — the bar puts it in the textarea for Paul
  // to verify/edit BEFORE sending. No auto-send (Whisper mangles
  // trading jargon — EMA → "Ehema" — and unverified transcripts
  // would corrupt the curriculum).
  // ---------------------------------------------------------------
  const transcribeVoice = useCallback(
    async (audio: Blob): Promise<string | null> => {
      setError(null);
      const fd = new FormData();
      // Backend accepts webm/mp4/ogg — recorder defaults to
      // audio/webm so the extension matches.
      const ext =
        audio.type.includes("mp4") ? "mp4"
        : audio.type.includes("ogg") ? "ogg"
        : "webm";
      fd.append("audio", audio, `voice.${ext}`);
      fd.append("language", "de");
      try {
        const res = await fetch("/api/proxy/admin/aven/sparring-stt", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as
          | (Partial<SttResponse> & {
              message?: string;
              detail?: string;
              error?: string;
            })
          | null;
        if (!res.ok) {
          const msg =
            data?.message ?? data?.detail ?? data?.error ?? `HTTP ${res.status}`;
          throw new Error(String(msg));
        }
        const text = typeof data?.text === "string" ? data.text : "";
        if (text.length === 0) {
          setError("STT returned an empty transcript. Try recording again.");
          return null;
        }
        return text;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "STT endpoint unreachable";
        setError(`Voice transcription failed · ${msg}`);
        return null;
      }
    },
    [],
  );

  const handleVoiceTurn = useCallback(async (audio: Blob) => {
    // Training-mode voice console — for now just acknowledges the
    // turn; backend wiring TBD with the training-stage rebuild.
    const localId = newLocalId("voice");
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

  // Scroll to bottom whenever a new tail bubble appears — covers
  // initial history paint, optimistic-user-push, and the live
  // user_message / aven_message blocks. requestAnimationFrame so
  // the scrollHeight reflects the just-mounted bubble before we
  // measure it.
  useEffect(() => {
    const last = messages[messages.length - 1];
    const key = last ? (last.localId ?? last.id) : null;
    if (key === lastBottomKeyRef.current) return;
    lastBottomKeyRef.current = key;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, thinking]);

  // ChatBubbleList expects readonly ChatBubbleListMessage[]. Our
  // StudioMessage is structurally compatible (id/role/content/
  // created_at/user_display_name). useMemo so the prop reference
  // is stable across re-renders unless messages actually changes.
  const renderable = useMemo(() => messages, [messages]);

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
                {/* Status dot — always live: solid emerald with a
                    soft animate-ping ring underneath. The thinking
                    state shows up in the chat (typing indicator /
                    pending bubble), not in the header — that's
                    Aven's identity strip, not a request-state badge. */}
                <span
                  aria-hidden
                  className="absolute -bottom-0.5 -right-0.5 inline-flex size-2"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
                    style={{ animationDuration: "2.2s" }}
                  />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald ring-2 ring-surface" />
                </span>
              </span>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-foreground">
                  Aven
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald/80">
                  live
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

      <div
        ref={scrollRef}
        className={[
          "relative overflow-y-auto bg-background/40 px-5 py-5",
          mode === "quick" ? "flex-1" : "h-[24vh] shrink-0",
        ].join(" ")}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-muted-foreground/70">
              {historyLoaded
                ? mode === "quick"
                  ? "Throw Aven a thought, or hit "
                  : "The studio is live. Type or speak — "
                : "Loading transcript…"}
              {historyLoaded && (
                <>
                  <span className="font-medium text-emerald">
                    {mode === "quick" ? "Start training" : "Aven is listening"}
                  </span>
                  {mode === "quick" ? " for a focused session." : "."}
                </>
              )}
            </p>
          </div>
        ) : (
          // userLabel sourced from the backend's canonical
          // user_display_name (first user-bubble that carries one);
          // "Du" fallback while we wait for the first one. Sparring
          // is web-only so the Telegram/Web pill is suppressed.
          <ChatBubbleList
            messages={renderable}
            userLabel={userLabel}
            showSource={false}
          />
        )}
      </div>

      {/* Input strip — ALWAYS rendered. Same affordances in both
          modes. bg-surface-elevated mirrors the dashboard chat. */}
      <div className="relative shrink-0 border-t border-emerald/20 bg-surface-elevated px-5 py-3 sm:px-6 sm:py-3.5">
        {error && (
          <p className="mb-2 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            {error}
          </p>
        )}
        <QuickCaptureBar
          onSend={handleSend}
          onTranscribe={transcribeVoice}
          busy={thinking}
        />
      </div>
    </div>
  );
}
