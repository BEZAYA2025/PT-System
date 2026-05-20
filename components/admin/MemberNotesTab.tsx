"use client";

import { useEffect, useState } from "react";
import {
  IconAlertCircle,
  IconLoader2,
  IconPencil,
  IconPlus,
  IconTag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import type {
  MemberAuditLogEntry,
  MemberDetail,
  MemberNote,
} from "@/lib/admin";

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

export function MemberNotesTab({ member }: Props) {
  const [notes, setNotes] = useState<MemberNote[] | null>(
    member.notes ?? null,
  );
  const [notesLoading, setNotesLoading] = useState(notes === null);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [tags, setTags] = useState<string[]>(member.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [tagBusy, setTagBusy] = useState(false);

  const [audit, setAudit] = useState<MemberAuditLogEntry[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>("");

  const [editing, setEditing] = useState<MemberNote | null>(null);
  const [draft, setDraft] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MemberNote | null>(null);

  // Notes loader — runs when member.notes wasn't preseeded.
  useEffect(() => {
    if (notes !== null) {
      setNotesLoading(false);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/notes`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as MemberNote[])
          : data && typeof data === "object"
            ? ((data as { notes?: MemberNote[] }).notes ?? [])
            : [];
        setNotes(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setNotesError(err.message);
      })
      .finally(() => {
        if (!cancelled) setNotesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id, notes]);

  // Audit loader.
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ limit: "50" });
    if (auditFilter) qs.set("action_type", auditFilter);
    fetch(
      `/api/proxy/admin/members/${encodeURIComponent(member.id)}/audit-log?${qs}`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as MemberAuditLogEntry[])
          : data && typeof data === "object"
            ? ((data as { entries?: MemberAuditLogEntry[] }).entries ?? [])
            : [];
        setAudit(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setAuditError(err.message);
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [member.id, auditFilter]);

  const sortedNotes = (notes ?? []).slice().sort((a, b) => {
    const at = Date.parse(a.created_at ?? "") || 0;
    const bt = Date.parse(b.created_at ?? "") || 0;
    return bt - at;
  });

  const createNote = async () => {
    const content = newContent.trim();
    if (!content || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const created =
        data && typeof data === "object" && "note" in data
          ? ((data as { note: MemberNote }).note)
          : (data as MemberNote);
      setNotes((prev) =>
        created ? [created, ...(prev ?? [])] : (prev ?? []),
      );
      setNewContent("");
      setAddingNew(false);
      setToast({ message: "Note added", tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Add failed · ${err.message}`
            : "Add failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!editing || busy) return;
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/notes/${encodeURIComponent(editing.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes((prev) =>
        (prev ?? []).map((n) =>
          n.id === editing.id
            ? { ...n, content, updated_at: new Date().toISOString() }
            : n,
        ),
      );
      setEditing(null);
      setDraft("");
      setToast({ message: "Note saved", tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Save failed · ${err.message}`
            : "Save failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteNote = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/notes/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes((prev) =>
        (prev ?? []).filter((n) => n.id !== confirmDelete.id),
      );
      setToast({ message: "Note deleted", tone: "success" });
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

  const addTag = async () => {
    const tag = tagInput.trim();
    if (!tag || tagBusy || tags.includes(tag)) return;
    setTagBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTags((prev) => [...prev, tag]);
      setTagInput("");
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Add tag failed · ${err.message}`
            : "Add tag failed",
        tone: "error",
      });
    } finally {
      setTagBusy(false);
    }
  };

  const removeTag = async (tag: string) => {
    if (tagBusy) return;
    setTagBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/members/${encodeURIComponent(member.id)}/tags`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTags((prev) => prev.filter((t) => t !== tag));
    } catch (err) {
      setToast({
        message:
          err instanceof Error
            ? `Remove tag failed · ${err.message}`
            : "Remove tag failed",
        tone: "error",
      });
    } finally {
      setTagBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tags */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-center gap-2">
          <IconTag size={14} stroke={1.75} className="text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Tags
          </h2>
        </header>
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {tags.length === 0 && (
            <p className="text-xs text-muted-foreground">No tags yet.</p>
          )}
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-foreground"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove tag ${t}`}
                onClick={() => removeTag(t)}
                disabled={tagBusy}
                className="inline-flex size-3.5 items-center justify-center rounded-full text-muted-foreground hover:text-red-300 disabled:opacity-50"
              >
                <IconX size={9} stroke={2} />
              </button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTag();
          }}
          className="mt-3 flex gap-2"
        >
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="Add tag…"
            disabled={tagBusy}
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
          <button
            type="submit"
            disabled={tagBusy || !tagInput.trim()}
            className="inline-flex h-8 items-center rounded-md border border-emerald/40 bg-emerald/[0.08] px-3 text-xs font-semibold text-emerald hover:bg-emerald/[0.14] disabled:opacity-60"
          >
            Add
          </button>
        </form>
      </section>

      {/* Notes */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Notes
          </h2>
          {!addingNew && (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald/40 bg-emerald/[0.08] px-3 text-xs font-semibold text-emerald hover:bg-emerald/[0.14]"
            >
              <IconPlus size={12} stroke={2} aria-hidden />
              Add note
            </button>
          )}
        </header>

        {addingNew && (
          <div className="mt-4 space-y-2 rounded-lg border border-emerald/30 bg-emerald/[0.04] p-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              placeholder="Write a note — markdown supported."
              disabled={busy}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddingNew(false);
                  setNewContent("");
                }}
                disabled={busy}
                className="inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createNote}
                disabled={busy || !newContent.trim()}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
              >
                {busy && (
                  <IconLoader2
                    size={12}
                    stroke={2}
                    className="animate-spin"
                    aria-hidden
                  />
                )}
                Save
              </button>
            </div>
          </div>
        )}

        {notesLoading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading notes…
          </p>
        ) : notesError ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load notes · {notesError}
          </p>
        ) : sortedNotes.length === 0 && !addingNew ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No notes yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sortedNotes.map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-border/60 bg-background p-3"
              >
                <header className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">
                    {formatDateTime(n.created_at)} · founder
                    {n.updated_at && n.updated_at !== n.created_at && (
                      <> · edited {formatDateTime(n.updated_at)}</>
                    )}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(n);
                        setDraft(n.content);
                      }}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                      aria-label="Edit note"
                    >
                      <IconPencil size={12} stroke={1.75} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(n)}
                      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/[0.08] hover:text-red-300"
                      aria-label="Delete note"
                    >
                      <IconTrash size={12} stroke={1.75} aria-hidden />
                    </button>
                  </span>
                </header>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {n.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Audit log */}
      <section className="rounded-2xl border border-border bg-surface/40 p-5">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Admin actions · audit log
          </h2>
          <select
            value={auditFilter}
            onChange={(e) => {
              setAuditFilter(e.target.value);
              setAuditLoading(true);
            }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-emerald focus:outline-none"
          >
            <option value="">All actions</option>
            <option value="tier_change">Tier change</option>
            <option value="suspend">Suspend</option>
            <option value="reactivate">Reactivate</option>
            <option value="refund">Refund</option>
            <option value="note">Note edits</option>
            <option value="tag">Tag changes</option>
          </select>
        </header>

        {auditLoading ? (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <IconLoader2
              size={12}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
            Loading…
          </p>
        ) : auditError ? (
          <p className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <IconAlertCircle size={12} stroke={1.75} aria-hidden />
            Couldn&apos;t load audit log · {auditError}
          </p>
        ) : !audit || audit.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No admin actions yet for this member.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {audit.map((entry, idx) => {
              const ts = entry.timestamp ?? entry.created_at;
              return (
                <li
                  key={`${ts ?? idx}-${idx}`}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      {entry.description ?? entry.action_type ?? "Action"}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(ts)}
                      {entry.actor && <> · {entry.actor}</>}
                    </p>
                  </div>
                  {entry.action_type && (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-border bg-surface px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {entry.action_type}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <Modal
        open={editing !== null}
        onClose={() => !busy && setEditing(null)}
        title="Edit note"
        size="md"
      >
        <div className="space-y-4 text-sm">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            disabled={busy}
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={busy || !draft.trim()}
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
              Save
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Delete this note?"
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>Permanent — the audit log will record the deletion.</p>
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
              onClick={deleteNote}
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
