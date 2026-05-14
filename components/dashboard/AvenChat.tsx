"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IconBrandTelegram,
  IconChevronUp,
  IconDeviceLaptop,
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

export function AvenChat({ initialMessages, initialQuota = null }: Props) {
  // Iter 7: synthetic greeting + WelcomeCard removed. The daily greeting is
  // now a real Aven message inserted server-side (flagged via
  // meta.greeting=true) and the first-login welcome moved to the global
  // SpotlightTour.
  const chat = useAvenChat({ initialMessages, initialQuota });

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

  const limitReached =
    chat.quota !== null &&
    !chat.quota.isUnlimited &&
    chat.quota.remaining_today <= 0;

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
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <ChatHeader
        quota={chat.quota}
        streamConnected={chat.streamConnected}
        messageCount={chat.messages.length}
      />

      <div
        ref={scrollRef}
        className="flex max-h-[480px] flex-col gap-4 overflow-y-auto px-5 py-5"
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
          {chat.messages.map((m) => (
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

function ChatHeader({
  quota,
  streamConnected,
  messageCount,
}: {
  quota: QuotaState | null;
  streamConnected: boolean;
  messageCount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div className="flex items-center gap-3">
        <AvenAvatar size={36} online={streamConnected} />
        <div>
          <p className="text-base font-semibold tracking-tight text-foreground">
            Aven
          </p>
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-emerald">
            <span
              aria-hidden
              className={[
                "size-1.5 rounded-full",
                streamConnected ? "bg-emerald" : "bg-muted-foreground",
              ].join(" ")}
            />
            {streamConnected ? "Online" : "Reconnecting…"}
          </p>
        </div>
      </div>

      {quota ? (
        quota.isUnlimited ? (
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald">
            Unlimited
          </p>
        ) : (
          <QuotaPill quota={quota} />
        )
      ) : (
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {messageCount} {messageCount === 1 ? "message" : "messages"}
        </p>
      )}
    </div>
  );
}

function QuotaPill({ quota }: { quota: QuotaState }) {
  const used = quota.total_today - quota.remaining_today;
  const pct = quota.total_today
    ? Math.min(100, Math.round((used / quota.total_today) * 100))
    : 0;
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <div className="h-1 w-20 overflow-hidden rounded-full bg-surface-elevated">
        <div
          className="h-full bg-emerald transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {used}/{quota.total_today} today
      </p>
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

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-2 border-t border-border bg-surface-elevated px-3 py-3 sm:px-5"
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
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
            recording
              ? "border-emerald bg-emerald/[0.18] text-emerald shadow-[0_0_28px_-4px_rgba(16,185,129,0.7)] animate-pulse"
              : transcribing
                ? "border-emerald/40 bg-emerald/[0.06] text-emerald"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            micDisabled && !recording ? "opacity-50" : "",
          ].join(" ")}
        >
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
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-300"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        )}

        <label htmlFor="aven-input" className="sr-only">
          Ask Aven anything
        </label>
        <textarea
          id="aven-input"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            recording
              ? "Recording…"
              : transcribing
                ? "Transcribing…"
                : "Ask Aven anything…"
          }
          disabled={limitReached || recording}
          className="block max-h-32 min-h-[44px] w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-emerald focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald disabled:opacity-50"
        />

        <button
          type="button"
          onClick={send}
          disabled={limitReached || input.trim().length === 0 || recording}
          aria-label="Send"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald text-background transition-colors hover:bg-emerald-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconSend2 size={18} stroke={2} />
        </button>
      </div>
    </form>
  );
}
