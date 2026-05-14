"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconMicrophone,
  IconSend2,
} from "@tabler/icons-react";
import { AvenAvatar } from "./AvenAvatar";
import type { ChatMessage } from "@/lib/mock-dashboard";

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

interface Props {
  initialMessages: ChatMessage[];
  quotaUsed: number;
  quotaLimit: number | null; // null = unlimited (VIP)
}

export function AvenChat({
  initialMessages,
  quotaUsed,
  quotaLimit,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to newest message.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const limitReached =
    quotaLimit !== null && quotaUsed >= quotaLimit;

  const handleSend = () => {
    const text = input.trim();
    if (!text || limitReached) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Skeleton: simulate Aven thinking + canned response so the UI feels
    // alive even before the backend is wired (Iteration 5).
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "aven",
          content:
            "Got it — I'll have a real take here once the chat backend lands. For now this is a UI preview.",
          ts: new Date().toISOString(),
        },
      ]);
    }, 700);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <AvenAvatar size={36} />
          <div>
            <p className="text-base font-semibold tracking-tight text-foreground">
              Aven
            </p>
            <p className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-emerald"
              />
              Online
            </p>
          </div>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {quotaLimit === null
            ? "Unlimited"
            : `${quotaUsed}/${quotaLimit} today`}
        </p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex max-h-[420px] flex-col gap-4 overflow-y-auto px-5 py-5"
      >
        {messages.map((m) => (
          <ChatBubble key={m.id} message={m} />
        ))}
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-surface-elevated px-3 py-3 sm:px-5">
        {limitReached && (
          <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
            Daily limit reached. Upgrade to VIP for unlimited Aven.
          </p>
        )}
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-label={recording ? "Stop recording" : "Start voice input"}
            onClick={() => setRecording((v) => !v)}
            disabled={limitReached}
            className={[
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
              recording
                ? "border-emerald bg-emerald/[0.12] text-emerald shadow-[0_0_24px_-6px_rgba(16,185,129,0.6)]"
                : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground",
              limitReached && "opacity-50",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <IconMicrophone size={18} stroke={1.75} />
          </button>
          <label htmlFor="aven-input" className="sr-only">
            Ask Aven anything
          </label>
          <textarea
            id="aven-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Aven anything…"
            disabled={limitReached}
            className="block w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-emerald focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={limitReached || input.trim().length === 0}
            aria-label="Send"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald text-background transition-colors hover:bg-emerald-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconSend2 size={18} stroke={2} />
          </button>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={[
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          isUser
            ? "rounded-tr-sm bg-emerald/[0.12] text-foreground"
            : "rounded-tl-sm bg-surface-elevated text-foreground",
        ].join(" ")}
      >
        <p className="whitespace-pre-line">{message.content}</p>
      </div>
      <p className="px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {isUser ? "you" : "Aven"} · {formatTime(message.ts)}
      </p>
    </div>
  );
}
