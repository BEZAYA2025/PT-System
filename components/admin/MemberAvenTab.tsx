"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconLoader2,
  IconMessage,
  IconSearch,
} from "@tabler/icons-react";
import type {
  AvenConversationSummary,
  MemberDetail,
} from "@/lib/admin";
import { ConversationTranscriptModal } from "./ConversationTranscriptModal";

interface Props {
  member: MemberDetail;
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

function truncate(s: string | null | undefined, max = 110): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

// Backend §25.B-2 (post-baba-audit): /aven/conversations/search ships
// {total, hits[]} where `hits` are INDIVIDUAL MESSAGES, not pre-grouped
// conversation summaries. Group them client-side by conversation_id so
// the UI gets one card per conversation (baba: 32 hits → 6 convs).
// Legacy {conversations} / {items} / raw-array shapes are still
// accepted as fallbacks — single source of truth for response shape.
interface AvenSearchHit {
  conversation_id?: string | null;
  conv_id?: string | null;
  chat_id?: string | null;
  conversationId?: string | null;
  message_id?: string | null;
  role?: string | null;
  speaker?: string | null;
  author?: string | null;
  content?: string | null;
  message?: string | null;
  text?: string | null;
  snippet?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  ts?: string | null;
}

// Pull the conversation-id off a hit defensively — backend §25.B-2 uses
// `conversation_id` but earlier deploys / drift could ship any of the
// camel/snake variants. Without this read, all 32 baba hits fall into
// the "no cid → skip" branch and the conversation list comes back
// empty even though the stats above it correctly report 6/32.
function hitConvId(h: AvenSearchHit): string | null {
  return (
    h.conversation_id ??
    h.conv_id ??
    h.chat_id ??
    h.conversationId ??
    null
  );
}

function hitContent(h: AvenSearchHit): string | null {
  return h.content ?? h.message ?? h.text ?? h.snippet ?? null;
}

function hitTimestamp(h: AvenSearchHit): string | null {
  return h.timestamp ?? h.created_at ?? h.ts ?? null;
}

function hitRole(h: AvenSearchHit): string {
  return (h.role ?? h.speaker ?? h.author ?? "").toLowerCase();
}

function groupHits(hits: AvenSearchHit[]): AvenConversationSummary[] {
  const groups = new Map<string, AvenSearchHit[]>();
  for (const hit of hits) {
    const cid = hitConvId(hit);
    if (!cid) continue;
    const arr = groups.get(cid) ?? [];
    arr.push(hit);
    groups.set(cid, arr);
  }
  return Array.from(groups.entries()).map(([cid, hs]) => {
    const sorted = [...hs].sort((a, b) => {
      const at = Date.parse(hitTimestamp(a) ?? "") || 0;
      const bt = Date.parse(hitTimestamp(b) ?? "") || 0;
      return at - bt;
    });
    const earliest = sorted[0];
    const firstUser = sorted.find((h) => {
      const r = hitRole(h);
      return r === "user" || r === "member";
    });
    return {
      id: cid,
      started_at: earliest ? hitTimestamp(earliest) : null,
      first_user_message: firstUser ? hitContent(firstUser) : null,
      snippet: earliest?.snippet ?? null,
      message_count: hs.length,
    };
  });
}

function parseConversationsResponse(data: unknown): AvenConversationSummary[] {
  if (Array.isArray(data)) return data as AvenConversationSummary[];
  if (!data || typeof data !== "object") return [];
  const obj = data as {
    conversations?: AvenConversationSummary[];
    items?: AvenConversationSummary[];
    results?: AvenConversationSummary[];
    hits?: AvenSearchHit[];
    messages?: AvenSearchHit[];
  };
  // Pauls P6 round 2: try every shape and use the first NON-EMPTY one
  // — earlier we returned the first present-but-empty key (e.g. when
  // backend ships {conversations: [], hits: [...32 messages]}, we used
  // to render the empty conversations array and never reach the
  // groupable hits). Now we walk through each candidate and only
  // commit if it contains items.
  const candidates: Array<() => AvenConversationSummary[]> = [
    () => (Array.isArray(obj.conversations) ? obj.conversations : []),
    () => (Array.isArray(obj.items) ? obj.items : []),
    () => (Array.isArray(obj.results) ? obj.results : []),
    () => (Array.isArray(obj.hits) ? groupHits(obj.hits) : []),
    () => (Array.isArray(obj.messages) ? groupHits(obj.messages) : []),
  ];
  for (const tryParse of candidates) {
    const list = tryParse();
    if (list.length > 0) return list;
  }
  // All paths empty — log the raw shape once so the next debug round
  // has something to point at (dev-mode only; production users never
  // see this).
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[MemberAvenTab] /aven/conversations/search returned no parseable list",
      { keys: Object.keys(obj) },
    );
  }
  return [];
}

export function MemberAvenTab({ member }: Props) {
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<
    AvenConversationSummary[] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AvenConversationSummary | null>(
    null,
  );

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ member_id: member.id });
        if (q.trim()) params.set("q", q.trim());
        params.set("limit", "100");
        const res = await fetch(
          `/api/proxy/admin/aven/conversations/search?${params}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json().catch(() => null);
        const list = parseConversationsResponse(data);
        // Default order: most recent first.
        list.sort((a, b) => {
          const at = Date.parse(a.started_at ?? "") || 0;
          const bt = Date.parse(b.started_at ?? "") || 0;
          return bt - at;
        });
        setConversations(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      } finally {
        setLoading(false);
      }
    },
    [member.id],
  );

  useEffect(() => {
    void load("");
  }, [load]);

  const stats = useMemo(() => {
    const list = conversations ?? [];
    const listTotal = list.length;
    const listMessages = list.reduce(
      (acc, c) => acc + (c.message_count ?? 0),
      0,
    );
    // Defensive layering — when /conversations/search returns 0 for a
    // member but the member-detail endpoint says they have N total
    // messages (verified for baba: 50 Aven messages, 0 search hits),
    // prefer the detail-endpoint counts so the stats card surfaces
    // the truth instead of "0". List-derived numbers are the
    // last-resort fallback.
    const conversationsCount =
      member.total_conversations ?? member.aven_conversations ?? listTotal;
    const totalMessages =
      member.total_aven_messages ??
      member.aven_messages ??
      listMessages;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const listMessages7d = list.reduce((acc, c) => {
      const t = Date.parse(c.started_at ?? "") || 0;
      if (t >= sevenDaysAgo) return acc + (c.message_count ?? 0);
      return acc;
    }, 0);
    const avg = conversationsCount > 0 ? totalMessages / conversationsCount : 0;
    // §25.B-2: canonical 7d count is engagement.aven_messages_count_7d.
    // baba shows 16 there; the top-level alias is the legacy shape.
    const messages7d =
      member.engagement?.aven_messages_count_7d ??
      member.aven_messages_count_7d ??
      listMessages7d;
    return {
      total: conversationsCount,
      totalMessages,
      messages7d,
      avg,
    };
  }, [conversations, member]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Conversations" value={stats.total.toLocaleString()} />
        <StatCard
          label="Total Messages"
          value={stats.totalMessages.toLocaleString()}
        />
        <StatCard
          label="Messages · 7d"
          value={stats.messages7d.toLocaleString()}
        />
        <StatCard label="Avg / Conv" value={stats.avg.toFixed(1)} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void load(query);
        }}
        className="relative"
      >
        <IconSearch
          size={14}
          stroke={1.75}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search this member's conversations…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
        />
      </form>

      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Conversations
          </h2>
          {!loading && conversations && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {conversations.length.toLocaleString()} result
              {conversations.length === 1 ? "" : "s"}
            </p>
          )}
        </header>
        {loading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading…
          </p>
        ) : error ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load conversations · {error}
          </p>
        ) : !conversations || conversations.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {query.trim()
              ? "No conversations match this search."
              : member.total_conversations && member.total_conversations > 0
                ? `Member has ${member.total_conversations} conversation${member.total_conversations === 1 ? "" : "s"} on record but the search endpoint didn't return them — likely a backend indexing gap.`
                : "No Aven conversations yet for this member."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-emerald/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(c.started_at)}
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {truncate(c.first_user_message ?? c.snippet, 140)}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                    <IconMessage size={11} stroke={1.75} aria-hidden />
                    {c.message_count ?? 0}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConversationTranscriptModal
        conversation={selected}
        onClose={() => setSelected(null)}
        onPrev={(() => {
          if (!selected || !conversations) return null;
          const idx = conversations.findIndex((c) => c.id === selected.id);
          if (idx <= 0) return null;
          return () => setSelected(conversations[idx - 1]);
        })()}
        onNext={(() => {
          if (!selected || !conversations) return null;
          const idx = conversations.findIndex((c) => c.id === selected.id);
          if (idx < 0 || idx >= conversations.length - 1) return null;
          return () => setSelected(conversations[idx + 1]);
        })()}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-border bg-surface/50 p-4">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </article>
  );
}
