"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconBolt,
  IconBook,
  IconCircleCheck,
  IconLoader2,
  IconMessage,
  IconMessageDots,
  IconSchool,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import { formatPct } from "@/lib/admin-format";

interface SparringMessage {
  id: string;
  role: "user" | "aven";
  content: string;
  ts: string;
  context?: SparringContext | null;
  feedbackGiven?: "correct" | "drift" | "improve" | null;
}

interface SparringContext {
  vkb_entries?: Array<{ id: string; title?: string | null }> | null;
  curriculum_topics?: Array<{ id: string; topic?: string | null }> | null;
  quality_score?: number | null;
}

interface CurriculumTopic {
  id: string;
  topic?: string | null;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TrainAvenSparringTab() {
  const [messages, setMessages] = useState<SparringMessage[]>([]);
  const [input, setInput] = useState("");
  const [topicPrompt, setTopicPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [commentFor, setCommentFor] = useState<SparringMessage | null>(null);
  const [curriculumFor, setCurriculumFor] = useState<SparringMessage | null>(
    null,
  );
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Best-effort fetch of curriculum topics so the "Add to
    // Curriculum" modal can populate its dropdown. Silent on
    // failure — modal then renders an "Add a topic in Curriculum
    // tab first" hint.
    fetch("/api/proxy/admin/aven/curriculum", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        const list = Array.isArray(data)
          ? (data as CurriculumTopic[])
          : data && typeof data === "object"
            ? ((data as { topics?: CurriculumTopic[] }).topics ?? [])
            : [];
        setTopics(list);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg: SparringMessage = {
      id: newId(),
      role: "user",
      content: trimmed,
      ts: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/proxy/aven/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          // Tag the conversation so the backend (Auftrag E) can
          // surface enriched context (VKB + curriculum + quality
          // score) and persist meta.founder_sparring=true.
          founder_sparring: true,
        }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : null) ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const inner =
        data && typeof data === "object"
          ? ((data as { reply?: string; response?: string; content?: string })
              .reply ??
              (data as { response?: string }).response ??
              (data as { content?: string }).content ??
              "")
          : "";
      const context =
        data && typeof data === "object"
          ? ((data as { context?: SparringContext }).context ?? null)
          : null;
      const avenMsg: SparringMessage = {
        id:
          data && typeof data === "object" && "message_id" in data
            ? String((data as { message_id: unknown }).message_id)
            : newId(),
        role: "aven",
        content: inner,
        ts: new Date().toISOString(),
        context,
      };
      setMessages((prev) => [...prev, avenMsg]);
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Send failed · ${err.message}`
            : "Send failed",
        tone: "error",
      });
    } finally {
      setSending(false);
    }
  };

  // Backend §25 Auftrag G: body key is `feedback_type` (not `type`)
  // and accepts `improved_response` alongside `comment` +
  // `curriculum_topic_id`.
  const sendFeedback = async (
    m: SparringMessage,
    feedback_type: "correct" | "drift" | "improve",
    body: {
      comment?: string;
      improved_response?: string;
      curriculum_topic_id?: string;
    } = {},
  ) => {
    try {
      const res = await fetch("/api/proxy/admin/aven/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: m.id,
          feedback_type,
          ...body,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(data?.message ?? `HTTP ${res.status}`);
      }
      setMessages((prev) =>
        prev.map((p) =>
          p.id === m.id ? { ...p, feedbackGiven: feedback_type } : p,
        ),
      );
      setToast({
        message:
          feedback_type === "correct"
            ? "Marked correct"
            : feedback_type === "drift"
              ? "Flagged as drift"
              : "Improvement noted",
        tone: "success",
      });
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Feedback failed · ${err.message}`
            : "Feedback failed",
        tone: "error",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="flex h-[70vh] flex-col rounded-xl border border-border bg-surface/30">
        {/* Topic prompt + clear */}
        <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          <IconBolt size={14} stroke={1.75} className="text-emerald" aria-hidden />
          <input
            type="text"
            value={topicPrompt}
            onChange={(e) => setTopicPrompt(e.target.value)}
            placeholder='Test Aven on a scenario · "How would you respond if a member shorts ETH at resistance?"'
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && topicPrompt.trim()) {
                void send(topicPrompt);
                setTopicPrompt("");
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (!topicPrompt.trim()) return;
              void send(topicPrompt);
              setTopicPrompt("");
            }}
            disabled={!topicPrompt.trim() || sending}
            className="inline-flex h-8 items-center rounded-md border border-emerald/40 bg-emerald/[0.08] px-3 text-xs font-semibold text-emerald hover:bg-emerald/[0.14] disabled:opacity-60"
          >
            Probe
          </button>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Start a sparring session. Aven&apos;s replies appear with
              4 founder-only review buttons (Correct · Drift · Comment
              · Add to Curriculum).
            </p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => {
                const user = m.role === "user";
                return (
                  <li key={m.id}>
                    <div
                      className={
                        user
                          ? "ml-auto max-w-[80%] rounded-xl border border-border bg-surface px-4 py-3 text-right"
                          : "mr-auto max-w-[85%] rounded-xl border border-emerald/20 bg-emerald/[0.04] px-4 py-3"
                      }
                    >
                      <p
                        className={[
                          "font-mono text-[10px] uppercase tracking-wider",
                          user ? "text-muted-foreground" : "text-emerald/80",
                        ].join(" ")}
                      >
                        {user ? "You" : "Aven"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                        {m.content}
                      </p>
                    </div>
                    {!user && (
                      <FounderTools
                        message={m}
                        onCorrect={() => void sendFeedback(m, "correct")}
                        onDrift={() => void sendFeedback(m, "drift")}
                        onComment={() => setCommentFor(m)}
                        onCurriculum={() => setCurriculumFor(m)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-end gap-2 border-t border-border px-4 py-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={2}
            placeholder="Ask Aven something…"
            className="min-h-[40px] flex-1 resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald px-4 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
          >
            {sending && (
              <IconLoader2
                size={14}
                stroke={2}
                className="animate-spin"
                aria-hidden
              />
            )}
            Send
          </button>
        </form>
      </section>

      {/* Context sidebar */}
      <aside className="flex flex-col gap-3">
        <ContextSidebar message={messages.filter((m) => m.role === "aven").slice(-1)[0] ?? null} />
      </aside>

      <Modal
        open={commentFor !== null}
        onClose={() => setCommentFor(null)}
        title="Improve this response"
        size="sm"
      >
        <CommentForm
          onCancel={() => setCommentFor(null)}
          onSubmit={(comment) => {
            if (commentFor) void sendFeedback(commentFor, "improve", { comment });
            setCommentFor(null);
          }}
        />
      </Modal>

      <Modal
        open={curriculumFor !== null}
        onClose={() => setCurriculumFor(null)}
        title="Add to curriculum"
        size="sm"
      >
        <CurriculumLinkForm
          topics={topics}
          onCancel={() => setCurriculumFor(null)}
          onSubmit={(topicId) => {
            if (curriculumFor)
              void sendFeedback(curriculumFor, "improve", {
                curriculum_topic_id: topicId,
              });
            setCurriculumFor(null);
          }}
        />
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function FounderTools({
  message,
  onCorrect,
  onDrift,
  onComment,
  onCurriculum,
}: {
  message: SparringMessage;
  onCorrect: () => void;
  onDrift: () => void;
  onComment: () => void;
  onCurriculum: () => void;
}) {
  const given = message.feedbackGiven;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <ToolButton
        onClick={onCorrect}
        active={given === "correct"}
        tone="emerald"
        icon={IconThumbUp}
        label="Correct"
      />
      <ToolButton
        onClick={onDrift}
        active={given === "drift"}
        tone="red"
        icon={IconThumbDown}
        label="Drift"
      />
      <ToolButton
        onClick={onComment}
        active={given === "improve"}
        tone="amber"
        icon={IconMessageDots}
        label="Comment"
      />
      <ToolButton
        onClick={onCurriculum}
        tone="sky"
        icon={IconSchool}
        label="Add to curriculum"
      />
    </div>
  );
}

function ToolButton({
  onClick,
  active,
  tone,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  tone: "emerald" | "red" | "amber" | "sky";
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
}) {
  const baseTone =
    tone === "emerald"
      ? "border-emerald/30 text-emerald hover:bg-emerald/[0.08]"
      : tone === "red"
        ? "border-red-400/30 text-red-300 hover:bg-red-500/[0.08]"
        : tone === "amber"
          ? "border-amber-500/30 text-amber-200 hover:bg-amber-500/[0.08]"
          : "border-sky-400/30 text-sky-300 hover:bg-sky-400/[0.08]";
  const activeTone =
    tone === "emerald"
      ? "bg-emerald/[0.14]"
      : tone === "red"
        ? "bg-red-500/[0.14]"
        : tone === "amber"
          ? "bg-amber-500/[0.14]"
          : "bg-sky-400/[0.14]";
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-7 items-center gap-1 rounded-full border bg-background px-2.5 text-[10px] font-medium",
        baseTone,
        active ? activeTone : "",
      ].join(" ")}
    >
      <Icon size={10} stroke={1.75} aria-hidden />
      {label}
    </button>
  );
}

function CommentForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (comment: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onSubmit(text.trim());
      }}
      className="space-y-4"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="What should Aven have said instead?"
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!text.trim()}
          className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

function CurriculumLinkForm({
  topics,
  onCancel,
  onSubmit,
}: {
  topics: CurriculumTopic[];
  onCancel: () => void;
  onSubmit: (topicId: string) => void;
}) {
  const [topicId, setTopicId] = useState("");
  if (topics.length === 0) {
    return (
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          No curriculum topics yet — add one in the Curriculum tab first,
          then come back and link.
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-sm font-semibold text-background"
          >
            OK
          </button>
        </div>
      </div>
    );
  }
  // Backend §25.F Auftrag G Nachtrag (Migration 0064): curriculum_topic_id
  // is now persisted, and the upstream returns 400 on unknown/invalid
  // IDs. Defensive check against the live topics list before submit so
  // a stale dropdown state can't shape an invalid request.
  const valid = topicId && topics.some((t) => t.id === topicId);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(topicId);
      }}
      className="space-y-4"
    >
      <label className="block">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Curriculum topic
        </span>
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
        >
          <option value="">— Pick a topic —</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.topic ?? t.id}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!valid}
          className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
        >
          Link
        </button>
      </div>
    </form>
  );
}

function ContextSidebar({ message }: { message: SparringMessage | null }) {
  if (!message || !message.context) {
    return (
      <article className="rounded-xl border border-dashed border-border bg-surface/30 p-4 text-xs text-muted-foreground">
        <header className="flex items-center gap-2">
          <IconMessage size={12} stroke={1.75} aria-hidden />
          <p className="font-mono uppercase tracking-wider">
            Aven&apos;s context
          </p>
        </header>
        <p className="mt-3">
          Context (retrieved VKB entries, referenced curriculum topics,
          quality score) appears here after Aven replies.
        </p>
      </article>
    );
  }
  const ctx = message.context;
  return (
    <article className="space-y-3 rounded-xl border border-border bg-surface/40 p-4">
      <header className="flex items-center gap-2">
        <IconMessage size={12} stroke={1.75} className="text-emerald" aria-hidden />
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Aven&apos;s context
        </p>
      </header>
      {typeof ctx.quality_score === "number" && (
        <div className="flex items-center gap-2 rounded-md border border-emerald/30 bg-emerald/[0.06] px-3 py-2 text-xs text-emerald">
          <IconCircleCheck size={12} stroke={2} aria-hidden />
          Quality {ctx.quality_score}/10 ({formatPct(ctx.quality_score / 10)})
        </div>
      )}
      {ctx.vkb_entries && ctx.vkb_entries.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <IconBook
              size={10}
              stroke={1.75}
              className="mr-1 inline"
              aria-hidden
            />
            VKB · {ctx.vkb_entries.length}
          </p>
          <ul className="mt-1 space-y-1 text-xs text-foreground">
            {ctx.vkb_entries.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-border/60 bg-background px-2 py-1"
              >
                {e.title ?? e.id}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ctx.curriculum_topics && ctx.curriculum_topics.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <IconSchool
              size={10}
              stroke={1.75}
              className="mr-1 inline"
              aria-hidden
            />
            Curriculum · {ctx.curriculum_topics.length}
          </p>
          <ul className="mt-1 space-y-1 text-xs text-foreground">
            {ctx.curriculum_topics.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-border/60 bg-background px-2 py-1"
              >
                {t.topic ?? t.id}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
