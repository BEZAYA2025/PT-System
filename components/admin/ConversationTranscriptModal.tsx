"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconChevronLeft,
  IconChevronRight,
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
//   · MemberAvenTab (conversation list — Pauls primary research tool;
//                    rendered with prev/next navigation so the founder
//                    can ride through a member's history without
//                    closing and re-opening)
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
  /** Optional prev/next walkers — when present, modal shows
   *  navigation chevrons in the header for stepping through the
   *  calling list (MemberAvenTab's research flow). */
  onPrev?: (() => void) | null;
  onNext?: (() => void) | null;
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

export function ConversationTranscriptModal({
  conversation,
  onClose,
  onPrev,
  onNext,
}: Props) {
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
          {onPrev !== undefined && (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onPrev?.()}
                disabled={!onPrev}
                aria-label="Previous conversation"
                title="Previous conversation"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <IconChevronLeft size={14} stroke={2} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onNext?.()}
                disabled={!onNext}
                aria-label="Next conversation"
                title="Next conversation"
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground disabled:opacity-40"
              >
                <IconChevronRight size={14} stroke={2} aria-hidden />
              </button>
            </span>
          )}
          <IconMessage size={14} stroke={1.75} aria-hidden />
          {headerLabel}
        </span>
      }
      description={description}
      size="xl"
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
          // Chat-replay layout — bubbles flank a center axis with a
          // small avatar circle outside each bubble (M = Member, A =
          // Aven) so the speaker is obvious even on a quick scan.
          // Right-aligned Member bubbles match the affordance the
          // member saw inside the dashboard.
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
                  className={[
                    "flex items-start gap-2",
                    user ? "flex-row-reverse" : "flex-row",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className={[
                      "inline-flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider",
                      user
                        ? "border border-border bg-surface text-muted-foreground"
                        : "border border-emerald/30 bg-emerald/[0.10] text-emerald",
                    ].join(" ")}
                  >
                    {user ? "M" : "A"}
                  </span>
                  <div
                    className={[
                      "min-w-0 max-w-[85%] rounded-xl px-4 py-3 sm:max-w-[78%]",
                      user
                        ? "border border-border bg-surface text-right"
                        : "border border-emerald/20 bg-emerald/[0.04]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider",
                        user
                          ? "justify-end text-muted-foreground"
                          : "text-emerald/80",
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
