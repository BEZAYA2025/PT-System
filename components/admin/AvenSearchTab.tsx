"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconCopy,
  IconLoader2,
  IconMessage,
  IconSearch,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import type { AvenConversationSummary } from "@/lib/admin";

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

function truncate(s: string | null | undefined, max = 140): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max).trimEnd()}…`;
}

export function AvenSearchTab() {
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minLength, setMinLength] = useState("");
  const [results, setResults] = useState<AvenConversationSummary[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AvenConversationSummary | null>(
    null,
  );

  // Debounce query — fires 350ms after the last keystroke so the
  // search endpoint isn't hit on every character. Filters trigger
  // immediately when changed.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!query.trim() && !startDate && !endDate && !minLength) {
      setResults(null);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      void run();
    }, 350);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, startDate, endDate, minLength]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (minLength) {
        const n = Number.parseInt(minLength, 10);
        if (Number.isFinite(n) && n > 0) params.set("min_length", String(n));
      }
      params.set("limit", "50");
      const res = await fetch(
        `/api/proxy/admin/aven/conversations/search?${params}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as AvenConversationSummary[])
        : data && typeof data === "object"
          ? ((data as { conversations?: AvenConversationSummary[] })
              .conversations ?? [])
          : [];
      setResults(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run();
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
          placeholder="Search across all conversations…"
          className="w-full rounded-lg border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
        />
      </form>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FilterField
          label="From date"
          input={
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          }
        />
        <FilterField
          label="To date"
          input={
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          }
        />
        <FilterField
          label="Min messages"
          input={
            <input
              type="number"
              min={1}
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              placeholder="Any"
              className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          }
        />
      </div>

      {loading && (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2
            size={12}
            stroke={2}
            className="animate-spin"
            aria-hidden
          />
          Searching…
        </p>
      )}
      {error && !loading && (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      )}

      {results === null && !loading ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          Start typing to search across all conversations.
        </div>
      ) : results !== null && results.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No conversations match your search.
        </div>
      ) : results !== null ? (
        <ul className="space-y-2">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelected(c)}
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 text-left transition-colors hover:border-emerald/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      {c.member_name ?? c.member_email ?? "Unknown member"}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {formatDateTime(c.started_at)}
                    </span>
                  </p>
                  {c.snippet ? (
                    <p
                      className="mt-1 text-sm text-foreground"
                      // Backend returns highlights as <mark>…</mark>.
                      dangerouslySetInnerHTML={{
                        __html: truncate(c.snippet, 200),
                      }}
                    />
                  ) : c.first_user_message ? (
                    <p className="mt-1 text-sm text-foreground">
                      {truncate(c.first_user_message, 200)}
                    </p>
                  ) : null}
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <IconMessage size={11} stroke={1.75} aria-hidden />
                  {c.message_count ?? 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <TranscriptModal
        conversation={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function FilterField({
  label,
  input,
}: {
  label: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block">{input}</span>
    </label>
  );
}

function TranscriptModal({
  conversation,
  onClose,
}: {
  conversation: AvenConversationSummary | null;
  onClose: () => void;
}) {
  if (!conversation) return null;

  const copy = async () => {
    const lines = [
      `Conversation · ${formatDateTime(conversation.started_at)}`,
      `Member: ${conversation.member_name ?? conversation.member_email ?? conversation.member_id}`,
      `Messages: ${conversation.message_count ?? 0}`,
      "",
      "First message:",
      conversation.first_user_message ?? "(none)",
      "",
      "Snippet:",
      conversation.snippet ?? "(none)",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
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
          <IconMessage size={14} stroke={1.75} aria-hidden />
          {conversation.member_name ?? conversation.member_email ?? "Conversation"}
        </span>
      }
      description={`${conversation.message_count ?? 0} messages · ${formatDateTime(conversation.started_at)}`}
      size="lg"
    >
      <div className="space-y-4 text-sm">
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

        <div className="rounded-md border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground">
          Full transcript endpoint pending — this view shows the
          first user message and the match snippet returned by the
          search. The per-conversation endpoint will swap in the
          full thread automatically.
        </div>

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
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
