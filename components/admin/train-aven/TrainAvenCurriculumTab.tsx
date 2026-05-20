"use client";

import { useCallback, useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconLoader2,
  IconMicrophone,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";

interface CurriculumTopic {
  id: string;
  topic?: string | null;
  description?: string | null;
  status?: "covered" | "pending" | "in_progress" | string | null;
  voice_note_recorded?: boolean | null;
  voice_note_id?: string | null;
}

const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "covered", label: "Covered" },
];

function statusTone(s: string | null | undefined): {
  pill: string;
  label: string;
} {
  const v = (s ?? "pending").toLowerCase();
  if (v === "covered")
    return {
      pill: "border-emerald/30 bg-emerald/[0.08] text-emerald",
      label: "Covered",
    };
  if (v === "in_progress")
    return {
      pill: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200",
      label: "In progress",
    };
  return {
    pill: "border-border bg-surface text-muted-foreground",
    label: "Pending",
  };
}

export function TrainAvenCurriculumTab() {
  const [topics, setTopics] = useState<CurriculumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CurriculumTopic | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CurriculumTopic | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/aven/curriculum", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as CurriculumTopic[])
        : data && typeof data === "object"
          ? ((data as { topics?: CurriculumTopic[] }).topics ?? [])
          : [];
      setTopics(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleDelete = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/aven/curriculum/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTopics((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setToast({ message: "Topic deleted", tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Delete failed · ${err.message}`
            : "Delete failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Curriculum
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Topics Aven should know cold. Mark coverage so the
            training queue knows what to prioritise.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
        >
          <IconPlus size={13} stroke={2} aria-hidden />
          Add topic
        </button>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading curriculum…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : topics.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No topics yet. Add one to start the training queue.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Topic</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Voice note</th>
                <th className="w-[80px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => {
                const tone = statusTone(t.status);
                return (
                  <tr key={t.id} className="border-b border-border/40 last:border-0">
                    <td className="px-3 py-2 text-sm font-medium text-foreground">
                      {t.topic ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {t.description ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
                      >
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {t.voice_note_recorded ? (
                        <span className="inline-flex items-center gap-1 text-emerald">
                          <IconMicrophone size={11} stroke={1.75} aria-hidden />
                          recorded
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        aria-label="Edit"
                        onClick={() => setEditing(t)}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                      >
                        <IconPencil size={12} stroke={1.75} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => setConfirmDelete(t)}
                        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/[0.08] hover:text-red-300"
                      >
                        <IconTrash size={12} stroke={1.75} aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(adding || editing) && (
        <TopicModal
          topic={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAdding(false);
            setEditing(null);
            setToast({
              message: editing ? "Topic saved" : "Topic created",
              tone: "success",
            });
            await reload();
          }}
        />
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Delete this topic?"
        description={confirmDelete?.topic ?? undefined}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            Any linked voice notes stay around; only the topic itself
            is removed from the training queue.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-sm font-semibold text-red-200 hover:bg-red-500/[0.14] disabled:opacity-60"
            >
              {busy && (
                <IconLoader2
                  size={14}
                  stroke={2}
                  className="animate-spin"
                  aria-hidden
                />
              )}
              Delete
            </button>
          </div>
        </div>
      </Modal>

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

function TopicModal({
  topic,
  onClose,
  onSaved,
}: {
  topic: CurriculumTopic | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = topic !== null;
  const [topicText, setTopicText] = useState(topic?.topic ?? "");
  const [description, setDescription] = useState(topic?.description ?? "");
  const [status, setStatus] = useState<string>(topic?.status ?? "pending");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicText.trim()) {
      setError("Topic is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/proxy/admin/aven/curriculum/${encodeURIComponent(topic!.id)}`
        : "/api/proxy/admin/aven/curriculum";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topicText.trim(),
          description: description.trim() || null,
          status,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          message?: string;
          error?: string;
        } | null;
        throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title={isEdit ? "Edit topic" : "Add curriculum topic"}
      size="md"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Topic
          </span>
          <input
            type="text"
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            disabled={busy}
            placeholder="Liquidation cascades"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            disabled={busy}
            placeholder="What Aven needs to internalise about this topic."
            className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Status
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="rounded-md border border-red-400/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
          >
            {busy && (
              <IconLoader2
                size={14}
                stroke={2}
                className="animate-spin"
                aria-hidden
              />
            )}
            {isEdit ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
