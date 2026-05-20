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
        // Backend §25 may wrap under `conversations`, `items`, or
        // ship a raw array — read all three so a per-deploy shape
        // drift doesn't blank the tab (root cause of the empty-Aven
        // bug Paul hit on baba's profile).
        const list = Array.isArray(data)
          ? (data as AvenConversationSummary[])
          : data && typeof data === "object"
            ? ((data as { conversations?: AvenConversationSummary[] })
                .conversations ??
              (data as { items?: AvenConversationSummary[] }).items ??
              [])
            : [];
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
    const total = list.length;
    const totalMessages = list.reduce(
      (acc, c) => acc + (c.message_count ?? 0),
      0,
    );
    // Aven messages count in member detail covers all-time; the source
    // can drift from the search-result sum so we expose the larger of
    // the two.
    const totalAllTime =
      (member.aven_messages ?? member.total_aven_messages ?? null) ??
      totalMessages;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const messages7d = list.reduce((acc, c) => {
      const t = Date.parse(c.started_at ?? "") || 0;
      if (t >= sevenDaysAgo) return acc + (c.message_count ?? 0);
      return acc;
    }, 0);
    const avg = total > 0 ? totalMessages / total : 0;
    return {
      total,
      totalMessages: totalAllTime,
      messages7d:
        member.aven_messages_count_7d ?? messages7d,
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
