"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconAlertCircle,
  IconCheck,
  IconClipboardCheck,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type { PendingBriefing } from "@/lib/admin";

interface Props {
  initialPending: PendingBriefing[] | null;
}

type ConfirmKind = "approve" | "reject" | null;

const KIND_BADGE: Record<string, string> = {
  morning: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200",
  midday: "border-emerald/30 bg-emerald/[0.08] text-emerald",
  evening: "border-violet-500/30 bg-violet-500/[0.08] text-violet-200",
};

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

function formatBriefingDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BriefingApprovalView({ initialPending }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingBriefing[]>(
    initialPending ?? [],
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialPending?.[0]?.id ?? null,
  );
  const [detail, setDetail] = useState<PendingBriefing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const selectedFromList = useMemo(
    () => pending.find((b) => b.id === selectedId) ?? null,
    [pending, selectedId],
  );

  // Fetch the full detail any time the member selects a different
  // briefing. The list endpoint may return abbreviated bodies — the
  // detail endpoint is the source of truth for the full content.
  // If the detail call fails we fall back to whatever the list gave
  // us so the reviewer can still read *something*.
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    fetch(`/api/proxy/admin/briefings/${encodeURIComponent(selectedId)}`, {
      cache: "no-store",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const briefing = (data as { briefing?: PendingBriefing })?.briefing
          ?? (data as PendingBriefing);
        setDetail(briefing ?? null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setDetailError(err.message);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const current = detail ?? selectedFromList;
  const body =
    current?.body ??
    current?.content ??
    selectedFromList?.body ??
    selectedFromList?.content ??
    "";

  const removeFromList = (id: string) => {
    setPending((prev) => {
      const next = prev.filter((b) => b.id !== id);
      const remaining = next[0]?.id ?? null;
      setSelectedId(remaining);
      return next;
    });
    setDetail(null);
  };

  const handleApprove = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/briefings/${encodeURIComponent(selectedId)}/approve`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      removeFromList(selectedId);
      setToast({ message: "Briefing approved & sent", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Approve failed · ${err.message}`
            : "Approve failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirmKind(null);
    }
  };

  const handleReject = async () => {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/briefings/${encodeURIComponent(selectedId)}/reject`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            rejectReason.trim() ? { reason: rejectReason.trim() } : {},
          ),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      removeFromList(selectedId);
      setToast({ message: "Briefing rejected", tone: "success" });
      router.refresh();
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Reject failed · ${err.message}`
            : "Reject failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirmKind(null);
      setRejectReason("");
    }
  };

  if (!initialPending) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] p-6">
        <p className="flex items-center gap-2 text-sm text-amber-200">
          <IconAlertCircle size={16} stroke={1.75} aria-hidden />
          Couldn&apos;t reach the briefings service. Try refreshing.
        </p>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/40 px-6 py-16 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full border border-emerald/30 bg-emerald/[0.08] text-emerald">
            <IconCheck size={24} stroke={2} aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            All caught up
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            No briefings pending review. Next briefing: tomorrow at
            06:01 UTC.
          </p>
        </div>
        <Toast value={toast} onDismiss={() => setToast(null)} />
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[40%_minmax(0,1fr)]">
      <aside aria-label="Pending briefings" className="space-y-2">
        <header className="rounded-xl border border-border bg-surface/50 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Pending Briefings
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pending.length} awaiting review
          </p>
        </header>

        <ul className="space-y-2">
          {pending.map((b) => {
            const isSelected = b.id === selectedId;
            const date =
              b.date ??
              b.generated_at ??
              b.created_at ??
              null;
            const kind = (b.kind ?? "").toLowerCase();
            const kindClass =
              KIND_BADGE[kind] ?? "border-border bg-surface text-muted-foreground";
            const asset = b.asset ?? b.symbol ?? null;
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(b.id)}
                  aria-current={isSelected ? "true" : undefined}
                  className={[
                    "flex w-full flex-col gap-1.5 rounded-xl border px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "border-emerald/50 bg-emerald/[0.06]"
                      : "border-border bg-surface/40 hover:border-foreground/20",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatBriefingDate(date)}
                    </span>
                    {kind && (
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${kindClass}`}
                      >
                        {kind}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">
                      {asset ?? "—"}
                    </span>
                    <span suppressHydrationWarning>
                      {formatRelative(b.generated_at ?? b.created_at)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section
        aria-label="Briefing detail"
        className="rounded-xl border border-border bg-surface/40"
      >
        {!current ? (
          <div className="px-6 py-16 text-center text-sm text-muted-foreground">
            Select a briefing from the list to review.
          </div>
        ) : (
          <article>
            <header className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 rounded-t-xl border-b border-border bg-surface/95 px-5 py-4 backdrop-blur">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {formatBriefingDate(
                    current.date ??
                      current.generated_at ??
                      current.created_at,
                  )}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {(current.asset ?? current.symbol ?? "—")} ·{" "}
                  {(current.kind ?? "briefing").toString()} ·{" "}
                  <span suppressHydrationWarning>
                    {formatRelative(
                      current.generated_at ?? current.created_at,
                    )}
                  </span>
                  {current.author && <> · {current.author}</>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmKind("reject")}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:border-red-400/40 hover:text-red-300 disabled:opacity-60"
                >
                  <IconX size={14} stroke={2} />
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmKind("approve")}
                  disabled={busy}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background transition-colors hover:bg-emerald-hover disabled:opacity-60"
                >
                  <IconClipboardCheck size={14} stroke={2} />
                  Approve & Send
                </button>
              </div>
            </header>

            <div className="px-5 py-5">
              {detailLoading && !detail && (
                <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <IconLoader2
                    size={12}
                    stroke={2}
                    className="animate-spin"
                    aria-hidden
                  />
                  Loading full briefing…
                </p>
              )}
              {detailError && (
                <p className="mb-3 inline-flex items-center gap-1.5 text-xs text-amber-300">
                  <IconAlertCircle size={12} stroke={1.75} aria-hidden />
                  Couldn&apos;t load the full body. Showing the preview from the list.
                </p>
              )}
              <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-foreground/90">
                {body || "(empty body)"}
              </pre>
            </div>
          </article>
        )}
      </section>

      <Modal
        open={confirmKind === "approve"}
        onClose={() => !busy && setConfirmKind(null)}
        title="Approve briefing?"
        description="This will send the briefing to all members immediately."
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            Once approved, the briefing goes out to every member with
            notifications enabled. This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmKind(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
            >
              {busy ? (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              ) : (
                <IconClipboardCheck size={14} stroke={2} />
              )}
              Approve & Send
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmKind === "reject"}
        onClose={() => !busy && setConfirmKind(null)}
        title="Reject briefing?"
        description="Optionally leave a note for the generator."
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Reason (optional)
            </span>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              placeholder="e.g. wrong asset, contradicts last week's setup, etc."
              className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmKind(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleReject}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-sm font-semibold text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
            >
              {busy ? (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              ) : (
                <IconX size={14} stroke={2} />
              )}
              Reject
            </button>
          </div>
        </div>
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
