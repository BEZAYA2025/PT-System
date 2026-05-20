"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react";
import type { MemberDetail } from "@/lib/admin";
import {
  ChatBubbleList,
  type ChatBubbleListMessage,
} from "@/components/dashboard/ChatBubbleList";

interface Props {
  member: MemberDetail;
}

// P6 final: the Member-Aven tab is now a READ-ONLY rendering of the
// member's full Aven history using the shared ChatBubbleList. This
// replaces the older Card-list + Transcript-Modal pattern that:
//   - rendered N empty boxes when the backend's hits[] used a
//     conversation_id alias the parser didn't recognise,
//   - crash-on-click into the modal when the message shape diverged.
//
// Data flow:
//   GET /api/proxy/admin/aven/conversations/search?member_id=…&limit=200
//   → hits[]   ← individual messages, NOT pre-grouped conversations
//   → flatten → ChatBubbleList (groups by day client-side, renders
//     WhatsApp-style date separators between day blocks)
//
// All reads are defensive (content/role/timestamp variants normalised
// by ChatBubbleList itself) so an unexpected backend shape can't
// render-crash this tab.

// Response wrappers we know about, ordered by likelihood. First match
// that yields a non-empty array wins.
function parseHits(data: unknown): ChatBubbleListMessage[] {
  if (Array.isArray(data)) return data as ChatBubbleListMessage[];
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;
  for (const key of ["hits", "messages", "items", "results"] as const) {
    const v = obj[key];
    if (Array.isArray(v) && v.length > 0) return v as ChatBubbleListMessage[];
  }
  // Backend may also ship {conversations: [{messages: [...]}]} — flatten
  // those into a single chronological list. Each conversation contributes
  // its messages array; ChatBubbleList sorts + groups everything by day.
  const convs = obj.conversations;
  if (Array.isArray(convs)) {
    const out: ChatBubbleListMessage[] = [];
    for (const c of convs as Array<Record<string, unknown>>) {
      const ms = c.messages;
      if (Array.isArray(ms)) {
        for (const m of ms) out.push(m as ChatBubbleListMessage);
      }
    }
    if (out.length > 0) return out;
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      "[MemberAvenTab] /aven/conversations/search returned no parseable messages",
      { keys: Object.keys(obj) },
    );
  }
  return [];
}

export function MemberAvenTab({ member }: Props) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatBubbleListMessage[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ member_id: member.id });
        if (q.trim()) params.set("q", q.trim());
        // Pull a wider page than the previous 100 so a chatty member
        // (50+ messages over a week) shows the full history without
        // hitting backend pagination yet. Backend caps internally if
        // truly unbounded.
        params.set("limit", "200");
        const res = await fetch(
          `/api/proxy/admin/aven/conversations/search?${params}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json().catch(() => null);
        setMessages(parseHits(data));
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
    const list = messages ?? [];
    // Prefer the detail-endpoint counters when present (canonical
    // truth for total volume); fall back to whatever the search
    // hits gave us so the cards still surface something on a stale
    // detail payload.
    const totalMessages =
      member.total_aven_messages ?? member.aven_messages ?? list.length;
    const conversationsCount =
      member.total_conversations ?? member.aven_conversations ?? null;
    const messages7d =
      member.engagement?.aven_messages_count_7d ??
      member.aven_messages_count_7d ??
      null;
    return {
      totalMessages,
      conversationsCount,
      messages7d,
    };
  }, [messages, member]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total Messages"
          value={stats.totalMessages.toLocaleString()}
        />
        <StatCard
          label="Conversations"
          value={
            stats.conversationsCount !== null
              ? stats.conversationsCount.toLocaleString()
              : "—"
          }
        />
        <StatCard
          label="Messages · 7d"
          value={stats.messages7d !== null ? stats.messages7d.toLocaleString() : "—"}
        />
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
          placeholder="Search this member's messages…"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
        />
      </form>

      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Conversation history
          </h2>
          {!loading && messages && (
            <p className="font-mono text-[11px] text-muted-foreground">
              {messages.length.toLocaleString()} message
              {messages.length === 1 ? "" : "s"} · read-only
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
            Loading transcript…
          </p>
        ) : error ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load transcript · {error}
          </p>
        ) : !messages || messages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {query.trim()
              ? "No messages match this search."
              : member.total_conversations && member.total_conversations > 0
                ? `Member has ${member.total_conversations} conversation${member.total_conversations === 1 ? "" : "s"} on record but the search endpoint didn't return them — likely a backend indexing gap.`
                : "No Aven conversations yet for this member."}
          </p>
        ) : (
          <div className="mt-5">
            <ChatBubbleList messages={messages} />
          </div>
        )}
      </section>
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
