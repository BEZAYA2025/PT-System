"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IconBrandTelegram,
  IconChartCandle,
  IconChevronUp,
  IconCrosshair,
  IconDeviceLaptop,
  IconHelp,
  IconLoader2,
  IconMessageCircle,
  IconMicrophone,
  IconPlayerStopFilled,
  IconRefresh,
  IconSend2,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { AvenAvatar } from "./AvenAvatar";
import { useAvenChat } from "./use-aven-chat";
import type { ChatMessage, QuotaState } from "@/lib/aven";

interface Props {
  initialMessages: ChatMessage[];
  /** SSR-known cursor info — drives the initial visibility of the
   *  "Load older messages" pill. */
  initialHasOlder?: boolean;
  /** Optional SSR-fetched quota; client refreshes after mount + each send. */
  initialQuota?: QuotaState | null;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Chronological ASC by timestamp (oldest at top, newest at bottom). The
 * backend doesn't guarantee /api/aven/history ordering, and SSE-pushed
 * Telegram messages can arrive out of order relative to optimistic local
 * sends. Sorting at render-time keeps the bubble flow sane without
 * mutating hook state.
 */
function sortChronological(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => {
    const at = new Date(a.ts).getTime();
    const bt = new Date(b.ts).getTime();
    if (Number.isFinite(at) && Number.isFinite(bt) && at !== bt) {
      return at - bt;
    }
    // Tie-breaker by numeric id when timestamps are equal/missing.
    const ai = Number(a.id);
    const bi = Number(b.id);
    if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
    return 0;
  });
}

export function AvenChat({
  initialMessages,
  initialHasOlder,
  initialQuota = null,
}: Props) {
  // Iter 7: synthetic greeting + WelcomeCard removed. The daily greeting is
  // now a real Aven message inserted server-side (flagged via
  // meta.greeting=true) and the first-login welcome moved to the global
  // SpotlightTour.
  const chat = useAvenChat({
    initialMessages,
    initialQuota,
    initialHasOlder,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastBottomIdRef = useRef<string | null>(null);
  const reduce = useReducedMotion();

  // Auto-scroll only when the *last* message changes (a new bottom row),
  // not when older history is prepended via loadOlder.
  useEffect(() => {
    const last = chat.messages[chat.messages.length - 1];
    const lastKey = last ? (last.localId ?? last.id) : null;
    if (lastKey !== lastBottomIdRef.current) {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
      lastBottomIdRef.current = lastKey;
    }
  }, [chat.messages, chat.thinking]);

  const limitReached = chat.quota !== null && !chat.quota.allowed;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void chat.send();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void chat.send();
    }
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald/30 bg-gradient-to-br from-surface via-surface to-emerald/[0.05] shadow-[0_0_80px_-20px_rgba(16,185,129,0.4),0_8px_36px_-12px_rgba(0,0,0,0.5)]">
      {/* Subtle ambient halo behind the avatar so the header feels alive
          without a heavy on-card pattern. Pointer-events-none so it never
          blocks chat interactions. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-12 -top-16 h-48 w-48 rounded-full bg-gradient-radial from-emerald/[0.18] via-emerald/[0.05] to-transparent blur-2xl"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 45%, transparent 70%)",
        }}
      />

      <ChatHeader
        quota={chat.quota}
        streamConnected={chat.streamConnected}
      />

      <PromptRotator
        userMessageCount={
          chat.messages.filter((m) => m.role === "user").length
        }
        onPick={(text) => {
          chat.setInput(text);
          // Defer so React commits the input value before send() reads it.
          setTimeout(() => void chat.send(), 0);
        }}
      />

      {/* Soft gradient fade between the header band and the chat scroll —
          taller in Round 11 to keep the first bubble away from the dividers. */}
      <span
        aria-hidden
        className="pointer-events-none block h-6 bg-gradient-to-b from-emerald/[0.06] via-emerald/[0.02] to-transparent"
      />

      <div
        ref={scrollRef}
        className="relative flex max-h-[480px] flex-col gap-4 overflow-y-auto bg-background/40 px-6 pb-8 pt-10 sm:px-8 sm:pb-10 sm:pt-12"
      >
        {chat.hasOlder && chat.messages.length > 0 && (
          <button
            type="button"
            onClick={() => void chat.loadOlder()}
            disabled={chat.loadingOlder}
            className="mx-auto inline-flex items-center gap-1.5 self-center rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground disabled:opacity-60"
          >
            <IconChevronUp size={12} stroke={2} />
            {chat.loadingOlder ? "Loading…" : "Load older messages"}
          </button>
        )}

        {chat.messages.length === 0 && (
          <ChatEmptyState />
        )}

        <AnimatePresence initial={false} mode="popLayout">
          {sortChronological(chat.messages).map((m) => (
            <motion.div
              key={m.localId ?? m.id}
              layout="position"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ChatBubble
                message={m}
                onRetry={() => m.localId && void chat.retry(m.localId)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {chat.thinking && <ThinkingIndicator />}
      </div>

      <ChatInput
        input={chat.input}
        setInput={chat.setInput}
        send={() => void chat.send()}
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        voice={chat.voice}
        startVoice={() => void chat.startVoice()}
        stopVoice={chat.stopVoice}
        cancelVoice={chat.cancelVoice}
        sendError={chat.sendError}
        limitReached={limitReached}
      />
    </section>
  );
}

// ---------------------------------------------------------------------------

// Round 11 header: text-light. AI MENTOR + Aven on the left, capability
// icons + status dot on the right (no "Online" / "Unlimited" / "X messages"
// labels — words removed per Paul's spec, identity carries the meaning).
function ChatHeader({
  quota,
  streamConnected,
}: {
  quota: QuotaState | null;
  streamConnected: boolean;
}) {
  return (
    <div className="relative flex items-center justify-between gap-4 border-b border-emerald/20 px-6 py-5 sm:gap-6 sm:px-8 sm:py-6">
      <div className="flex items-center gap-4 sm:gap-5">
        <AvenAvatar size={36} online={streamConnected} breath />
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald/85">
            AI Mentor
          </p>
          <p className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Aven
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <CapabilityRow />
        <StatusDot
          online={streamConnected}
          quota={quota}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capability row — small emerald-tinted icons surfacing what Aven can do
// without text-noise. Hidden below sm so the mobile header stays clean.
// ---------------------------------------------------------------------------

const CAPABILITIES = [
  { Icon: IconMessageCircle, label: "Chat" },
  { Icon: IconMicrophone, label: "Voice input" },
  { Icon: IconBrandTelegram, label: "Telegram-synced" },
  { Icon: IconChartCandle, label: "Live market data" },
  { Icon: IconCrosshair, label: "Setup analysis" },
] as const;

function CapabilityRow() {
  return (
    <div className="hidden items-center gap-1.5 sm:flex" aria-label="Aven capabilities">
      {CAPABILITIES.map(({ Icon, label }) => (
        <span
          key={label}
          title={label}
          className="inline-flex size-7 items-center justify-center rounded-md text-emerald/65 transition-all hover:scale-110 hover:bg-emerald/[0.08] hover:text-emerald"
        >
          <Icon size={14} stroke={1.75} aria-hidden />
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status dot — pure visual: pulsing emerald when streaming, grey otherwise.
// Quota state is folded into the title so the data is still discoverable
// without adding header text.
// ---------------------------------------------------------------------------

function StatusDot({
  online,
  quota,
}: {
  online: boolean;
  quota: QuotaState | null;
}) {
  const title = quotaTitle(online, quota);
  return (
    <span
      title={title}
      aria-label={title}
      className="relative inline-flex size-2.5 shrink-0"
    >
      {online && (
        <span
          aria-hidden
          className="absolute inset-0 animate-ping rounded-full bg-emerald opacity-60"
          style={{ animationDuration: "2s" }}
        />
      )}
      <span
        aria-hidden
        className={[
          "relative inline-flex size-2.5 rounded-full",
          online ? "bg-emerald shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-muted-foreground",
        ].join(" ")}
      />
    </span>
  );
}

function quotaTitle(online: boolean, quota: QuotaState | null): string {
  const conn = online ? "Online" : "Reconnecting…";
  if (!quota) return conn;
  if (quota.isUnlimited) return `${conn} · unlimited messages`;
  if (quota.limit === null || quota.limit === 0) return conn;
  return `${conn} · ${quota.used}/${quota.limit} today`;
}

// ---------------------------------------------------------------------------
// Prompt rotator — single rotating "Try …" line under the header. Replaces
// the static three-chip strip from Round 10. Auto-fades after the user
// has sent three messages; the "?" pill restores it. Click-to-send.
// ---------------------------------------------------------------------------

const STARTER_PROMPTS: ReadonlyArray<string> = [
  "How's BTC right now?",
  "Explain Fibonacci retracements in Paul's method.",
  "What's a good setup today based on the live market?",
  "Review my last open trade.",
];

function PromptRotator({
  userMessageCount,
  onPick,
}: {
  userMessageCount: number;
  onPick: (text: string) => void;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showing, setShowing] = useState(true);
  const reduce = useReducedMotion();

  const autoVisible = userMessageCount < 3;
  const visible = autoVisible && !dismissed;

  // Fade-out → swap text → fade-in every ~5.5s. Skip the animation when
  // the user prefers reduced motion.
  useEffect(() => {
    if (!visible) return;
    if (reduce) {
      const id = setInterval(
        () => setIdx((i) => (i + 1) % STARTER_PROMPTS.length),
        5500,
      );
      return () => clearInterval(id);
    }
    const id = setInterval(() => {
      setShowing(false);
      const swap = setTimeout(() => {
        setIdx((i) => (i + 1) % STARTER_PROMPTS.length);
        setShowing(true);
      }, 220);
      return () => clearTimeout(swap);
    }, 5500);
    return () => clearInterval(id);
  }, [visible, reduce]);

  if (!visible) {
    return (
      <div className="flex justify-end border-b border-emerald/10 bg-surface/30 px-6 py-2 sm:px-8">
        <button
          type="button"
          onClick={() => setDismissed(false)}
          aria-label="Show starter prompts"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:border-emerald/40 hover:text-emerald"
        >
          <IconHelp size={11} stroke={1.75} aria-hidden />
        </button>
      </div>
    );
  }

  const current = STARTER_PROMPTS[idx];

  return (
    <div className="flex items-center gap-3 border-b border-emerald/10 bg-surface/30 px-6 py-2.5 sm:px-8">
      <button
        type="button"
        onClick={() => onPick(current)}
        aria-label={`Send: ${current}`}
        className="group flex flex-1 items-center gap-2 truncate text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-emerald/70">
          Try
        </span>
        <span
          className="truncate text-[13px] text-muted-foreground transition-opacity duration-200 group-hover:text-foreground"
          style={{ opacity: showing ? 1 : 0 }}
        >
          &ldquo;{current}&rdquo;
        </span>
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Hide prompts"
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
      >
        <IconX size={12} stroke={1.75} aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ChatBubble({
  message,
  onRetry,
}: {
  message: ChatMessage;
  onRetry: () => void;
}) {
  const isUser = message.role === "user";
  const tone = isUser
    ? "rounded-tr-sm bg-emerald/[0.12] text-foreground"
    : "rounded-tl-sm bg-surface-elevated text-foreground";

  const status = message.status;
  const failed = status === "failed";
  const sending = status === "sending";

  return (
    <div
      className={["flex flex-col gap-1", isUser ? "items-end" : "items-start"].join(
        " ",
      )}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          tone,
          failed ? "ring-1 ring-red-400/40" : "",
          sending ? "opacity-70" : "",
          message.isGreeting ? "ring-1 ring-emerald/30" : "",
        ].join(" ")}
      >
        {message.isGreeting && (
          <p className="mb-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald">
            <IconSparkles size={10} stroke={2} aria-hidden />
            Daily greeting
          </p>
        )}
        <p className="whitespace-pre-line">{message.content}</p>
      </div>

      <div className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{isUser ? "you" : "Aven"}</span>
        <span aria-hidden>·</span>
        <span>{formatTime(message.ts)}</span>
        <SourceTag source={message.source} />
        {failed && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 text-red-300 transition-colors hover:text-red-200"
          >
            <IconRefresh size={11} stroke={1.75} />
            Failed · retry
          </button>
        )}
        {sending && <span className="text-emerald">sending…</span>}
      </div>
    </div>
  );
}

function SourceTag({ source }: { source: ChatMessage["source"] }) {
  if (source === "telegram") {
    return (
      <span
        className="inline-flex items-center gap-1 text-emerald"
        title="From Telegram"
      >
        <IconBrandTelegram size={11} stroke={1.75} aria-hidden />
        Telegram
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground/70"
      title="From the web"
    >
      <IconDeviceLaptop size={11} stroke={1.75} aria-hidden />
      Web
    </span>
  );
}

// ---------------------------------------------------------------------------

function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AvenAvatar size={28} />
      <div className="rounded-2xl rounded-tl-sm bg-surface-elevated px-4 py-3">
        <span className="inline-flex items-center gap-1">
          <Dot delay="0s" />
          <Dot delay="0.15s" />
          <Dot delay="0.3s" />
        </span>
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 animate-bounce rounded-full bg-emerald/70"
      style={{ animationDelay: delay, animationDuration: "1.2s" }}
    />
  );
}

// ---------------------------------------------------------------------------

function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.06] text-emerald">
        <IconMessageCircle size={28} stroke={1.5} aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Start a conversation with Aven
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Ask about a setup, a trade you&apos;re watching, or just say hi.
          Aven sees the live market data and Paul&apos;s methodology.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ChatInputProps {
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  voice: ReturnType<typeof useAvenChat>["voice"];
  startVoice: () => void;
  stopVoice: () => void;
  cancelVoice: () => void;
  sendError: string | null;
  limitReached: boolean;
}

function formatRecordingDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function SoundWaveBars() {
  // Five emerald bars riding three offset keyframe curves — gives the
  // panel an obvious "audio is being captured" pulse without external deps.
  const curves = [
    { name: "pt-wave-a", delay: "0ms" },
    { name: "pt-wave-b", delay: "120ms" },
    { name: "pt-wave-c", delay: "240ms" },
    { name: "pt-wave-a", delay: "360ms" },
    { name: "pt-wave-b", delay: "480ms" },
  ];
  return (
    <span aria-hidden className="flex h-6 items-center gap-[3px]">
      {curves.map((c, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-emerald"
          style={{
            animation: `${c.name} 0.9s ease-in-out infinite`,
            animationDelay: c.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes pt-wave-a { 0%, 100% { height: 4px; } 50% { height: 20px; } }
        @keyframes pt-wave-b { 0%, 100% { height: 8px; } 50% { height: 24px; } }
        @keyframes pt-wave-c { 0%, 100% { height: 6px; } 50% { height: 14px; } }
      `}</style>
    </span>
  );
}

function ChatInput({
  input,
  setInput,
  send,
  onSubmit,
  onKeyDown,
  voice,
  startVoice,
  stopVoice,
  cancelVoice,
  sendError,
  limitReached,
}: ChatInputProps) {
  const recording = voice.recording;
  const transcribing = voice.transcribing;
  const micDisabled = limitReached || !voice.supported;

  // Live elapsed counter while recording. Resets to 0 the moment voice
  // toggles off so the panel doesn't flash a stale value next time round.
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [recording]);

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 border-t border-border bg-surface-elevated px-4 py-3 sm:px-8"
    >
      {limitReached && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
          Daily limit reached. Upgrade to VIP for unlimited Aven.
        </p>
      )}
      {sendError && !limitReached && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300"
        >
          {sendError}
        </p>
      )}
      {voice.error && (
        <p
          role="alert"
          className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200"
        >
          {voice.error}
        </p>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          aria-label={
            recording
              ? "Stop recording and transcribe"
              : transcribing
                ? "Transcribing voice…"
                : "Start voice input"
          }
          onClick={() => {
            if (recording) stopVoice();
            else if (!transcribing) startVoice();
          }}
          disabled={micDisabled || transcribing}
          className={[
            "relative inline-flex shrink-0 items-center justify-center rounded-full border-2 transition-all",
            recording
              ? "size-12 border-emerald bg-emerald/[0.22] text-emerald shadow-[0_0_32px_-2px_rgba(16,185,129,0.85)]"
              : transcribing
                ? "size-11 border-emerald/40 bg-emerald/[0.06] text-emerald"
                : "size-11 border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            micDisabled && !recording ? "opacity-50" : "",
          ].join(" ")}
        >
          {recording && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-emerald/60 animate-ping"
              style={{ animationDuration: "1.3s" }}
            />
          )}
          {recording ? (
            <IconPlayerStopFilled size={16} stroke={2} />
          ) : (
            <IconMicrophone size={18} stroke={1.75} />
          )}
        </button>

        {recording && (
          <button
            type="button"
            onClick={cancelVoice}
            aria-label="Cancel recording"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-background text-red-300 transition-colors hover:bg-red-500/[0.08]"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        )}

        <label htmlFor="aven-input" className="sr-only">
          Ask Aven anything
        </label>

        {recording ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-[44px] flex-1 items-center gap-3 rounded-2xl border-2 border-emerald/60 bg-emerald/[0.06] px-4 shadow-[0_0_24px_-6px_rgba(16,185,129,0.45)]"
          >
            <SoundWaveBars />
            <span className="font-mono text-sm font-semibold text-emerald">
              Recording {formatRecordingDuration(elapsed)}
            </span>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              Tap mic to send · X to cancel
            </span>
          </div>
        ) : transcribing ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-[44px] flex-1 items-center gap-3 rounded-2xl border border-emerald/40 bg-emerald/[0.06] px-4"
          >
            <IconLoader2
              size={16}
              className="animate-spin text-emerald"
              aria-hidden
            />
            <span className="font-mono text-sm text-emerald">
              Transcribing your voice…
            </span>
          </div>
        ) : (
          <textarea
            id="aven-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Aven anything…"
            disabled={limitReached}
            className="block max-h-32 min-h-[44px] w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-emerald focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald disabled:opacity-50"
          />
        )}

        <button
          type="button"
          onClick={send}
          disabled={
            limitReached ||
            input.trim().length === 0 ||
            recording ||
            transcribing
          }
          aria-label="Send"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald text-background transition-colors hover:bg-emerald-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconSend2 size={18} stroke={2} />
        </button>
      </div>
    </form>
  );
}
