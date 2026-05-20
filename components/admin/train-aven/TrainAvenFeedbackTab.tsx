"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  IconAlertCircle,
  IconLoader2,
  IconMessageDots,
  IconSchool,
  IconShieldCheck,
  IconThumbDown,
  IconThumbUp,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import { formatDateTime } from "@/lib/admin-format";

// Feedback reviewer aggregates two backend feeds:
//   1. quality-audit-reports.latest_critical (q ≤ 3 implicit)
//   2. drift-log filtered to severity=critical
// Both are merged into a single chronological review queue.

interface QualityCritical {
  id?: string | null;
  timestamp?: string | null;
  pattern?: string | null;
  original_snippet?: string | null;
  conversation_id?: string | null;
  member_id?: string | null;
  member_email?: string | null;
}

interface DriftEntry {
  id?: string | null;
  severity?: string | null;
  pattern_matched?: string | null;
  original_text?: string | null;
  replaced_text?: string | null;
  conversation_id?: string | null;
  member_id?: string | null;
  member_email?: string | null;
  created_at?: string | null;
}

type ReviewItem =
  | {
      kind: "quality";
      id: string;
      timestamp: string | null;
      pattern: string | null;
      snippet: string | null;
      memberId: string | null;
      memberEmail: string | null;
      conversationId: string | null;
    }
  | {
      kind: "drift";
      id: string;
      timestamp: string | null;
      pattern: string | null;
      original: string | null;
      replaced: string | null;
      memberId: string | null;
      memberEmail: string | null;
      conversationId: string | null;
    };

export function TrainAvenFeedbackTab() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [commentFor, setCommentFor] = useState<ReviewItem | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(
        "/api/proxy/admin/aven/quality-audit-reports?days=30",
        { cache: "no-store" },
      ).then(async (r) => (r.ok ? r.json() : null)),
      fetch(
        "/api/proxy/admin/aven/drift-log?severity=critical&limit=100",
        { cache: "no-store" },
      ).then(async (r) => (r.ok ? r.json() : null)),
    ])
      .then(([qa, drift]) => {
        if (cancelled) return;
        const qualityList: QualityCritical[] = (() => {
          if (!qa || typeof qa !== "object") return [];
          const arr = (qa as { latest_critical?: QualityCritical[] }).latest_critical;
          return Array.isArray(arr) ? arr : [];
        })();
        const driftList: DriftEntry[] = (() => {
          if (Array.isArray(drift)) return drift as DriftEntry[];
          if (drift && typeof drift === "object") {
            const arr = (drift as { entries?: DriftEntry[] }).entries;
            if (Array.isArray(arr)) return arr;
          }
          return [];
        })();

        const merged: ReviewItem[] = [
          ...qualityList.map<ReviewItem>((q, idx) => ({
            kind: "quality",
            id: q.id ?? `q-${idx}`,
            timestamp: q.timestamp ?? null,
            pattern: q.pattern ?? null,
            snippet: q.original_snippet ?? null,
            memberId: q.member_id ?? null,
            memberEmail: q.member_email ?? null,
            conversationId: q.conversation_id ?? null,
          })),
          ...driftList.map<ReviewItem>((d, idx) => ({
            kind: "drift",
            id: d.id ?? `d-${idx}`,
            timestamp: d.created_at ?? null,
            pattern: d.pattern_matched ?? null,
            original: d.original_text ?? null,
            replaced: d.replaced_text ?? null,
            memberId: d.member_id ?? null,
            memberEmail: d.member_email ?? null,
            conversationId: d.conversation_id ?? null,
          })),
        ];
        merged.sort((a, b) => {
          const at = Date.parse(a.timestamp ?? "") || 0;
          const bt = Date.parse(b.timestamp ?? "") || 0;
          return bt - at;
        });
        setItems(merged);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sendFeedback = async (
    item: ReviewItem,
    type: "correct" | "drift" | "improve",
    body: { comment?: string } = {},
  ) => {
    setBusyId(item.id);
    try {
      const res = await fetch("/api/proxy/admin/aven/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: item.id,
          conversation_id: item.conversationId,
          type,
          ...body,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Optimistic: drop the row from the queue once feedback lands.
      setItems((prev) => prev.filter((p) => p.id !== item.id));
      setToast({
        message:
          type === "correct"
            ? "Marked correct"
            : type === "drift"
              ? "Drift confirmed"
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
    } finally {
      setBusyId(null);
      setCommentFor(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Feedback reviewer
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Low-quality Aven responses (q ≤ 3) and critical drift
          flags merged into one queue. Verdict ships to{" "}
          <code className="font-mono text-[11px]">/aven/feedback</code>.
        </p>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading queue…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald/30 bg-emerald/[0.05] px-6 py-12 text-center">
          <IconShieldCheck
            size={28}
            stroke={1.5}
            className="text-emerald"
            aria-hidden
          />
          <p className="mt-2 text-sm font-medium text-foreground">
            Queue is clear
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Nothing flagged for review.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-border bg-surface/40 p-4"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
                      item.kind === "quality"
                        ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-200"
                        : "border-red-400/40 bg-red-500/[0.08] text-red-300",
                    ].join(" ")}
                  >
                    {item.kind === "quality" ? "Low quality" : "Drift"}
                  </span>
                  {item.pattern && (
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {item.pattern}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
                {item.memberId ? (
                  <Link
                    href={`/admin/members/${item.memberId}?tab=aven`}
                    className="text-[11px] text-emerald hover:text-emerald-hover"
                  >
                    {item.memberEmail ?? item.memberId}
                  </Link>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    {item.memberEmail ?? "—"}
                  </span>
                )}
              </header>

              {item.kind === "quality" ? (
                <p className="mt-3 whitespace-pre-wrap rounded-lg border border-border/60 bg-background px-3 py-2 text-xs text-foreground">
                  {item.snippet ?? "(no snippet)"}
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Original
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-red-400/30 bg-red-500/[0.05] px-3 py-2 font-mono text-[11px] text-red-200">
                      {item.original ?? "—"}
                    </pre>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Replaced
                    </p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-emerald/30 bg-emerald/[0.05] px-3 py-2 font-mono text-[11px] text-emerald">
                      {item.replaced ?? "—"}
                    </pre>
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <ActionButton
                  onClick={() => void sendFeedback(item, "correct")}
                  busy={busyId === item.id}
                  tone="emerald"
                  icon={IconThumbUp}
                  label="Correct"
                />
                <ActionButton
                  onClick={() => void sendFeedback(item, "drift")}
                  busy={busyId === item.id}
                  tone="red"
                  icon={IconThumbDown}
                  label="Confirm drift"
                />
                <ActionButton
                  onClick={() => setCommentFor(item)}
                  busy={busyId === item.id}
                  tone="amber"
                  icon={IconMessageDots}
                  label="Improve"
                />
                {item.conversationId && (
                  <Link
                    href={`/admin/aven?tab=search&open_conv=${encodeURIComponent(item.conversationId)}`}
                    className="ml-auto inline-flex h-7 items-center gap-1 rounded-full border border-border bg-background px-2.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    <IconSchool size={10} stroke={1.75} aria-hidden />
                    Open in Aven search
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={commentFor !== null}
        onClose={() => busyId === null && setCommentFor(null)}
        title="Suggest improvement"
        size="sm"
      >
        <CommentForm
          busy={busyId !== null}
          onCancel={() => setCommentFor(null)}
          onSubmit={(comment) => {
            if (commentFor) void sendFeedback(commentFor, "improve", { comment });
          }}
        />
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function ActionButton({
  onClick,
  busy,
  tone,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  busy: boolean;
  tone: "emerald" | "red" | "amber";
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  label: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald/30 text-emerald hover:bg-emerald/[0.08]"
      : tone === "red"
        ? "border-red-400/30 text-red-300 hover:bg-red-500/[0.08]"
        : "border-amber-500/30 text-amber-200 hover:bg-amber-500/[0.08]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={[
        "inline-flex h-7 items-center gap-1 rounded-full border bg-background px-2.5 text-[10px] font-medium disabled:opacity-60",
        toneClass,
      ].join(" ")}
    >
      {busy ? (
        <IconLoader2
          size={10}
          stroke={2}
          className="animate-spin"
          aria-hidden
        />
      ) : (
        <Icon size={10} stroke={1.75} aria-hidden />
      )}
      {label}
    </button>
  );
}

function CommentForm({
  busy,
  onCancel,
  onSubmit,
}: {
  busy: boolean;
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
        disabled={busy}
        placeholder="What should Aven have said?"
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy || !text.trim()}
          className="inline-flex h-9 items-center rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
