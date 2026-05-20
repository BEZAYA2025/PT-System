"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconFileUpload,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconPhoto,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";

interface VkbEntry {
  id: string;
  title?: string | null;
  description?: string | null;
  tags?: string[] | string | null;
  file_path?: string | null;
  file_url?: string | null;
  file_thumbnail_url?: string | null;
  created_at?: string | null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeTags(t: VkbEntry["tags"]): string[] {
  if (!t) return [];
  if (Array.isArray(t)) return t;
  return t
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseTagsInput(s: string): string[] {
  return s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function AvenVkbTab() {
  const [entries, setEntries] = useState<VkbEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<VkbEntry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VkbEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<VkbEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/proxy/admin/vkb/entries", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as VkbEntry[])
        : data && typeof data === "object"
          ? ((data as { entries?: VkbEntry[] }).entries ?? [])
          : [];
      setEntries(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const handleDelete = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/vkb/entries/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEntries((prev) =>
        (prev ?? []).filter((e) => e.id !== confirmDelete.id),
      );
      setToast({ message: "Entry deleted", tone: "success" });
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
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            Vector Knowledge Base
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Chart-image references Aven can match against during
            briefings and chat replies.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
        >
          <IconPlus size={13} stroke={2} aria-hidden />
          Add Entry
        </button>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2
            size={12}
            stroke={2}
            className="animate-spin"
            aria-hidden
          />
          Loading entries…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      ) : !entries || entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No entries yet. Click <strong>Add Entry</strong> to upload
          the first chart.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-[80px] px-3 py-2 font-medium">Chart</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Tags</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="w-[80px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const tags = normalizeTags(e.tags);
                const thumb = e.file_thumbnail_url ?? e.file_url ?? null;
                return (
                  <tr
                    key={e.id}
                    onClick={() => setDetailEntry(e)}
                    className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-surface/60"
                  >
                    <td className="px-3 py-2">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt=""
                          className="size-14 rounded-md border border-border bg-background object-cover"
                        />
                      ) : (
                        <span className="inline-flex size-14 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground">
                          <IconPhoto size={18} stroke={1.5} aria-hidden />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground">
                      {e.title ?? "Untitled"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                            >
                              {t}
                            </span>
                          ))
                        )}
                        {tags.length > 4 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            +{tags.length - 4}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(e.created_at)}
                    </td>
                    <td
                      className="px-2 py-2"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={() => setEditing(e)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                        >
                          <IconPencil size={12} stroke={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={() => setConfirmDelete(e)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/[0.08] hover:text-red-300"
                        >
                          <IconTrash size={12} stroke={1.75} aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen && (
        <VkbAddOrEditModal
          mode="add"
          onClose={() => setAddOpen(false)}
          onSaved={async () => {
            setAddOpen(false);
            setToast({ message: "Entry added", tone: "success" });
            await reload();
          }}
        />
      )}

      {editing && (
        <VkbAddOrEditModal
          mode="edit"
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setToast({ message: "Entry updated", tone: "success" });
            await reload();
          }}
        />
      )}

      {detailEntry && (
        <VkbDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onEdit={() => {
            setEditing(detailEntry);
            setDetailEntry(null);
          }}
          onDelete={() => {
            setConfirmDelete(detailEntry);
            setDetailEntry(null);
          }}
        />
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Delete this entry?"
        description={confirmDelete?.title ?? undefined}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            The chart image and its embedding are removed permanently
            — Aven stops matching against it.
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

function VkbDetailModal({
  entry,
  onClose,
  onEdit,
  onDelete,
}: {
  entry: VkbEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = normalizeTags(entry.tags);
  const url = entry.file_url ?? entry.file_thumbnail_url ?? null;
  return (
    <Modal
      open
      onClose={onClose}
      title={entry.title ?? "Untitled"}
      description={`Added ${formatDate(entry.created_at)}`}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={entry.title ?? "chart"}
            className="w-full rounded-lg border border-border bg-background"
          />
        )}
        {entry.description && (
          <p className="whitespace-pre-wrap text-foreground">
            {entry.description}
          </p>
        )}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-between gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-xs font-semibold text-red-200 hover:bg-red-500/[0.14]"
          >
            <IconTrash size={12} stroke={1.75} aria-hidden />
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:border-emerald/40"
            >
              <IconPencil size={12} stroke={1.75} aria-hidden />
              Edit
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

function VkbAddOrEditModal({
  mode,
  entry,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  entry?: VkbEntry;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = mode === "edit";
  const [title, setTitle] = useState(entry?.title ?? "");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [tagsInput, setTagsInput] = useState(
    normalizeTags(entry?.tags).join(", "),
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const f = list[0];
    if (!f.type.startsWith("image/")) {
      setError("File must be an image.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!isEdit && !file) {
      setError("Pick a chart image.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (isEdit && entry) {
        // PATCH metadata — JSON. File re-upload happens via a future
        // dedicated multipart endpoint.
        const res = await fetch(
          `/api/proxy/admin/vkb/entries/${encodeURIComponent(entry.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim(),
              description: description.trim() || null,
              tags: parseTagsInput(tagsInput),
            }),
          },
        );
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            message?: string;
            error?: string;
          } | null;
          throw new Error(
            data?.message ?? data?.error ?? `HTTP ${res.status}`,
          );
        }
      } else {
        // POST multipart — title / description / tags / file.
        const fd = new FormData();
        fd.append("title", title.trim());
        if (description.trim()) fd.append("description", description.trim());
        const tagList = parseTagsInput(tagsInput);
        if (tagList.length > 0) {
          fd.append("tags", tagList.join(","));
        }
        if (file) fd.append("file", file);
        const res = await fetch("/api/proxy/admin/vkb/entries", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            message?: string;
            error?: string;
          } | null;
          throw new Error(
            data?.message ?? data?.error ?? `HTTP ${res.status}`,
          );
        }
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
      title={isEdit ? "Edit entry" : "Add VKB entry"}
      description={
        isEdit
          ? "Metadata only — file re-upload arrives in a follow-up."
          : undefined
      }
      size="md"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
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
            rows={4}
            disabled={busy}
            placeholder="Optional · markdown supported"
            className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Tags (comma-separated)
          </span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={busy}
            placeholder="btc, breakout, daily"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
        </label>

        {!isEdit && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Chart image
            </p>
            <div
              onDrop={(e) => {
                e.preventDefault();
                onFiles(e.dataTransfer.files);
              }}
              onDragOver={(e) => e.preventDefault()}
              className="mt-1 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center"
            >
              {file ? (
                <>
                  <span className="inline-flex items-center gap-2 font-mono text-xs text-foreground">
                    <IconPhoto size={14} stroke={1.75} aria-hidden />
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <IconX size={11} stroke={1.75} />
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <IconFileUpload
                    size={22}
                    stroke={1.5}
                    className="text-muted-foreground"
                    aria-hidden
                  />
                  <p className="text-xs text-muted-foreground">
                    Drag-drop an image here, or
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:border-emerald/40"
                  >
                    Choose file
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </>
              )}
            </div>
          </div>
        )}

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
            {isEdit ? "Save" : "Upload"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
