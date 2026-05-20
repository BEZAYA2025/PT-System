"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconCopy,
  IconLoader2,
  IconMessage,
  IconMoodHappy,
  IconMoodNeutral,
  IconMoodSad,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import {
  parseAvenMessages,
  type AvenMessage,
  type AvenMessageMeta,
} from "@/lib/admin-helpers";

// Shared transcript modal used by:
//   · MemberAvenTab (conversation list)
//   · AvenSearchTab (global search results)
//   · AvenDriftLogTab (drift-detail → "View conversation")
//
// Caller provides whatever conversation context it has on hand
// (id is required, summary fields are optional fallbacks while
// the full /conversations/<id> request is in flight or 404s).
// Quality_score + sentiment meta badges render on Aven messages
// when the backend includes them.

interface SummaryContext {
  id: string;
  member_id?: string | null;
  member_name?: string | null;
  member_email?: string | null;
  started_at?: string | null;
  message_count?: number | null;
  first_user_message?: string | null;
  snippet?: string | null;
}

interface Props {
  conversation: SummaryContext | null;
  onClose: () => void;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUserMessage(role: string | null | undefined): boolean {
  const r = (role ?? "").toLowerCase();
  return r === "user" || r === "member";
}

function readQualityScore(meta: AvenMessageMeta | null | undefined): number | null {
  if (!meta) return null;
  if (typeof meta.quality_score === "number") return meta.quality_score;
  if (typeof meta.qualityScore === "number") return meta.qualityScore;
  return null;
}

function readSentiment(meta: AvenMessageMeta | null | undefined): string | null {
  if (!meta) return null;
  return meta.sentiment ?? null;
}

function sentimentIcon(s: string | null) {
  const v = (s ?? "").toLowerCase();
  if (v === "positive") return IconMoodHappy;
  if (v === "negative") return IconMoodSad;
  if (v === "neutral") return IconMoodNeutral;
  return null;
}

function sentimentTone(s: string | null): string {
  const v = (s ?? "").toLowerCase();
  if (v === "positive") return "text-emerald";
  if (v === "negative") return "text-red-300";
  return "text-muted-foreground";
}

export function ConversationTranscriptModal({ conversation, onClose }: Props) {
  const [messages, setMessages] = useState<AvenMessage[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!conversation) return;
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    setMessages(null);
    fetch(
      `/api/proxy/admin/aven/conversations/${encodeURIComponent(conversation.id)}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (r.status === 404) {
          if (!cancelled) setUnavailable(true);
          return null;
        }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled || data === null) return;
        setMessages(parseAvenMessages(data));
      })
      .catch(() => {
        if (!cancelled) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [conversation]);

  if (!conversation) return null;

  const headerLabel =
    conversation.member_name ??
    conversation.member_email ??
    `Conversation ${conversation.id.slice(0, 8)}`;
  const description = conversation.message_count
    ? `${conversation.message_count} messages · ${formatDateTime(conversation.started_at)}`
    : formatDateTime(conversation.started_at);

  const copyTranscript = async () => {
    let body: string;
    if (messages && messages.length > 0) {
      body = messages
        .map((m) => `${m.role ?? "?"}: ${m.content ?? ""}`)
        .join("\n\n");
    } else {
      body = [
        `Conversation · ${formatDateTime(conversation.started_at)}`,
        `Member: ${conversation.member_name ?? conversation.member_email ?? conversation.member_id ?? ""}`,
        "",
        "First message:",
        conversation.first_user_message ?? "(none)",
        "",
        "Snippet:",
        conversation.snippet ?? "(none)",
      ].join("\n");
    }
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      // ignore
    }
  };

  const hasFullTranscript = messages !== null && messages.length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <IconMessage size={14} stroke={1.75} aria-hidden />
          {headerLabel}
        </span>
      }
      description={description}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        {loading && (
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading transcript…
          </p>
        )}

        {hasFullTranscript ? (
          <div className="space-y-3">
            {messages.map((m, i) => {
              const user = isUserMessage(m.role);
              const ts = m.timestamp ?? m.ts ?? m.created_at;
              const score = readQualityScore(m.meta ?? null);
              const sentiment = readSentiment(m.meta ?? null);
              const SentimentIcon = sentimentIcon(sentiment);
              return (
                <div
                  key={i}
                  className={
                    user
                      ? "ml-auto max-w-[80%] rounded-xl border border-border bg-surface px-4 py-3 text-right"
                      : "mr-auto max-w-[85%] rounded-xl border border-emerald/20 bg-emerald/[0.04] px-4 py-3"
                  }
                >
                  <div
                    className={[
                      "flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider",
                      user ? "justify-end text-muted-foreground" : "text-emerald/80",
                    ].join(" ")}
                  >
                    <span>
                      {user ? "Member" : "Aven"}
                      {ts ? ` · ${formatDateTime(ts)}` : ""}
                    </span>
                    {!user && typeof score === "number" && (
                      <span className="inline-flex items-center rounded-full border border-emerald/30 bg-emerald/[0.10] px-1.5 text-emerald">
                        Q{score}/10
                      </span>
                    )}
                    {!user && SentimentIcon && (
                      <SentimentIcon
                        size={11}
                        stroke={1.75}
                        className={sentimentTone(sentiment)}
                        aria-label={sentiment ?? undefined}
                      />
                    )}
                  </div>
                  <p
                    className={[
                      "mt-1 whitespace-pre-wrap text-foreground",
                      user ? "text-right" : "",
                    ].join(" ")}
                  >
                    {m.content ?? ""}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {conversation.first_user_message && (
              <div className="ml-auto max-w-[80%] rounded-xl border border-border bg-surface px-4 py-3 text-right">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Member · first message
                </p>
                <p className="mt-1 whitespace-pre-wrap text-foreground">
                  {conversation.first_user_message}
                </p>
              </div>
            )}
            {conversation.snippet && (
              <div className="mr-auto max-w-[85%] rounded-xl border border-emerald/20 bg-emerald/[0.04] px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-emerald/80">
                  Aven · matched snippet
                </p>
                <p
                  className="mt-1 whitespace-pre-wrap text-foreground"
                  dangerouslySetInnerHTML={{ __html: conversation.snippet }}
                />
              </div>
            )}
            {unavailable && !loading && (
              <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                Full transcript not available for this conversation —
                showing the snippet returned by the search endpoint.
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-between gap-2 pt-2">
          {conversation.member_id ? (
            <Link
              href={`/admin/members/${conversation.member_id}?tab=aven`}
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
              onClick={copyTranscript}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
            >
              <IconCopy size={12} stroke={1.75} aria-hidden />
              Copy transcript
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
