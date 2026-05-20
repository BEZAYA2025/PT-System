"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconCopy,
  IconMessage,
  IconPlugConnected,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";

interface LiveMessage {
  role: "user" | "aven";
  content: string;
  timestamp: string | null;
}

interface LiveConversation {
  id: string;
  memberId: string | null;
  memberEmail: string | null;
  memberName: string | null;
  startedAt: string;
  lastEventAt: string;
  messages: LiveMessage[];
  typing: boolean;
  ended: boolean;
}

type WindowKey = "5min" | "15min" | "1hour";

const WINDOWS: Array<{ key: WindowKey; label: string; ms: number }> = [
  { key: "5min", label: "Last 5 min", ms: 5 * 60_000 },
  { key: "15min", label: "Last 15 min", ms: 15 * 60_000 },
  { key: "1hour", label: "Last 1 hour", ms: 60 * 60_000 },
];

function nowIso(): string {
  return new Date().toISOString();
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function truncate(s: string, max = 60): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

interface EventPayload {
  conversation_id: string;
  member_id?: string | null;
  member_email?: string | null;
  member_name?: string | null;
  content?: string | null;
  timestamp?: string | null;
}

export function AvenLiveTab() {
  const [conversations, setConversations] = useState<
    Map<string, LiveConversation>
  >(() => new Map());
  const [status, setStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const [windowFilter, setWindowFilter] = useState<WindowKey>("15min");
  const [openConvId, setOpenConvId] = useState<string | null>(null);
  // Tick state so relative-times re-render every 5s.
  const [, setTick] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  // SSE connection. The EventSource auto-reconnects on transient
  // disconnects; we only flag "error" when the readyState lands on
  // CLOSED (typically auth failure or backend down).
  useEffect(() => {
    const es = new EventSource("/api/proxy/admin/aven/live-stream");
    esRef.current = es;

    const update = (
      mutator: (m: Map<string, LiveConversation>) => void,
    ) => {
      setConversations((prev) => {
        const next = new Map(prev);
        mutator(next);
        return next;
      });
    };

    const handleStarted = (e: MessageEvent) => {
      const payload = safeParse<EventPayload>(e.data);
      if (!payload) return;
      const id = payload.conversation_id;
      const ts = payload.timestamp ?? nowIso();
      update((m) => {
        m.set(id, {
          id,
          memberId: payload.member_id ?? null,
          memberEmail: payload.member_email ?? null,
          memberName: payload.member_name ?? null,
          startedAt: ts,
          lastEventAt: ts,
          messages: [],
          typing: false,
          ended: false,
        });
      });
    };

    const handleUserMsg = (e: MessageEvent) => {
      const payload = safeParse<EventPayload>(e.data);
      if (!payload) return;
      const id = payload.conversation_id;
      const ts = payload.timestamp ?? nowIso();
      update((m) => {
        const existing = m.get(id) ?? bootstrap(id, payload, ts);
        existing.messages.push({
          role: "user",
          content: payload.content ?? "",
          timestamp: ts,
        });
        existing.lastEventAt = ts;
        existing.typing = true;
        existing.ended = false;
        m.set(id, { ...existing });
      });
    };

    const handleAvenMsg = (e: MessageEvent) => {
      const payload = safeParse<EventPayload>(e.data);
      if (!payload) return;
      const id = payload.conversation_id;
      const ts = payload.timestamp ?? nowIso();
      update((m) => {
        const existing = m.get(id) ?? bootstrap(id, payload, ts);
        existing.messages.push({
          role: "aven",
          content: payload.content ?? "",
          timestamp: ts,
        });
        existing.lastEventAt = ts;
        existing.typing = false;
        m.set(id, { ...existing });
      });
    };

    const handleEnded = (e: MessageEvent) => {
      const payload = safeParse<EventPayload>(e.data);
      if (!payload) return;
      const id = payload.conversation_id;
      const ts = payload.timestamp ?? nowIso();
      update((m) => {
        const existing = m.get(id);
        if (existing) {
          existing.ended = true;
          existing.lastEventAt = ts;
          existing.typing = false;
          m.set(id, { ...existing });
        }
      });
    };

    es.addEventListener("open", () => setStatus("live"));
    es.addEventListener("conversation.started", handleStarted);
    es.addEventListener("message.user", handleUserMsg);
    es.addEventListener("message.aven", handleAvenMsg);
    es.addEventListener("conversation.ended", handleEnded);
    es.addEventListener("error", () => {
      if (es.readyState === EventSource.CLOSED) {
        setStatus("error");
      }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 5_000);
    return () => window.clearInterval(id);
  }, []);

  const windowMs = WINDOWS.find((w) => w.key === windowFilter)?.ms ?? 15 * 60_000;
  const cutoff = Date.now() - windowMs;

  const visible = useMemo(() => {
    return Array.from(conversations.values())
      .filter((c) => {
        const t = Date.parse(c.lastEventAt) || 0;
        return t >= cutoff;
      })
      .sort((a, b) => {
        const at = Date.parse(a.lastEventAt) || 0;
        const bt = Date.parse(b.lastEventAt) || 0;
        return bt - at;
      });
  }, [conversations, cutoff]);

  const openConv = openConvId ? conversations.get(openConvId) ?? null : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {WINDOWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setWindowFilter(key)}
              aria-pressed={windowFilter === key}
              className={[
                "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
                windowFilter === key
                  ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <StatusPill status={status} count={visible.length} />
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/30 px-6 py-16 text-center">
          <IconMessage
            size={32}
            stroke={1.5}
            className="text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-3 text-base font-semibold tracking-tight text-foreground">
            No active conversations right now
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            New conversations will appear here as members start
            chatting with Aven.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <ConversationCard
              key={c.id}
              conv={c}
              onOpen={() => setOpenConvId(c.id)}
            />
          ))}
        </div>
      )}

      <LiveTranscriptModal
        conv={openConv}
        onClose={() => setOpenConvId(null)}
      />
    </div>
  );
}

function bootstrap(
  id: string,
  payload: EventPayload,
  ts: string,
): LiveConversation {
  return {
    id,
    memberId: payload.member_id ?? null,
    memberEmail: payload.member_email ?? null,
    memberName: payload.member_name ?? null,
    startedAt: ts,
    lastEventAt: ts,
    messages: [],
    typing: false,
    ended: false,
  };
}

function safeParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

function StatusPill({
  status,
  count,
}: {
  status: "connecting" | "live" | "error";
  count: number;
}) {
  if (status === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/[0.05] px-3 py-1 font-mono text-[11px] text-amber-200">
        <IconAlertCircle size={11} stroke={1.75} aria-hidden />
        Stream disconnected · refresh to retry
      </span>
    );
  }
  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-muted-foreground">
        <IconPlugConnected size={11} stroke={1.75} aria-hidden />
        Connecting…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.08] px-3 py-1 font-mono text-[11px] text-emerald">
      <span
        aria-hidden
        className="inline-block size-1.5 animate-pulse rounded-full bg-emerald"
      />
      Live · {count} in window
    </span>
  );
}

function ConversationCard({
  conv,
  onOpen,
}: {
  conv: LiveConversation;
  onOpen: () => void;
}) {
  const last = conv.messages[conv.messages.length - 1] ?? null;
  const memberLabel =
    conv.memberName ??
    conv.memberEmail ??
    (conv.memberId ? conv.memberId.slice(0, 8) : "Unknown member");

  return (
    <button
      type="button"
      onClick={onOpen}
      className={[
        "flex flex-col gap-2 rounded-xl border bg-surface/40 p-4 text-left transition-colors",
        conv.ended
          ? "border-border opacity-70 hover:border-border"
          : "border-emerald/20 hover:border-emerald/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald/[0.12] font-mono text-xs font-semibold text-emerald"
          >
            <IconUser size={14} stroke={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {memberLabel}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {conv.messages.length} msg
              {conv.messages.length === 1 ? "" : "s"} ·{" "}
              {relativeTime(conv.lastEventAt)}
            </p>
          </div>
        </div>
        {conv.ended ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            ended
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/[0.10] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald">
            <span
              aria-hidden
              className="inline-block size-1.5 animate-pulse rounded-full bg-emerald"
            />
            active
          </span>
        )}
      </div>

      {last ? (
        <p className="text-xs text-muted-foreground">
          <span
            className={
              last.role === "user" ? "text-foreground" : "text-emerald"
            }
          >
            {last.role === "user" ? "Member" : "Aven"}:
          </span>{" "}
          {truncate(last.content, 80)}
        </p>
      ) : (
        <p className="text-xs italic text-muted-foreground">
          Waiting for first message…
        </p>
      )}

      {conv.typing && !conv.ended && (
        <p className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-emerald">
          <span aria-hidden className="inline-block animate-pulse">
            ●●●
          </span>
          Aven typing…
        </p>
      )}
    </button>
  );
}

function LiveTranscriptModal({
  conv,
  onClose,
}: {
  conv: LiveConversation | null;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on every new message.
  useEffect(() => {
    if (!conv) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conv?.messages.length, conv]);

  if (!conv) return null;
  const memberLabel =
    conv.memberName ?? conv.memberEmail ?? conv.memberId ?? conv.id;

  const copy = async () => {
    const lines = conv.messages.map((m) => `${m.role}: ${m.content}`);
    try {
      await navigator.clipboard.writeText(lines.join("\n\n"));
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <IconUser size={14} stroke={1.75} aria-hidden />
          {memberLabel}
          {!conv.ended && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald/30 bg-emerald/[0.10] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-emerald">
              <span
                aria-hidden
                className="inline-block size-1.5 animate-pulse rounded-full bg-emerald"
              />
              live
            </span>
          )}
        </span>
      }
      description={`${conv.messages.length} message${conv.messages.length === 1 ? "" : "s"}`}
      size="lg"
    >
      <div className="space-y-3" ref={bodyRef}>
        {conv.messages.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No messages yet — the next one streams in here.
          </p>
        )}
        {conv.messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[80%] rounded-xl border border-border bg-surface px-4 py-3 text-right"
                : "mr-auto max-w-[85%] rounded-xl border border-emerald/20 bg-emerald/[0.04] px-4 py-3"
            }
          >
            <p
              className={
                m.role === "user"
                  ? "font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  : "font-mono text-[10px] uppercase tracking-wider text-emerald/80"
              }
            >
              {m.role === "user" ? "Member" : "Aven"} ·{" "}
              {relativeTime(m.timestamp)}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
              {m.content}
            </p>
          </div>
        ))}

        {conv.typing && !conv.ended && (
          <div className="mr-auto inline-flex items-center gap-2 rounded-xl border border-emerald/20 bg-emerald/[0.04] px-3 py-2 font-mono text-[11px] text-emerald">
            <span aria-hidden className="inline-block animate-pulse">
              ●●●
            </span>
            Aven typing…
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2">
          {conv.memberId ? (
            <Link
              href={`/admin/members/${conv.memberId}?tab=aven`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
            >
              Open member detail
            </Link>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
            >
              <IconCopy size={12} stroke={1.75} aria-hidden />
              Copy
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
            >
              <IconX size={12} stroke={2} className="mr-1" aria-hidden />
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
