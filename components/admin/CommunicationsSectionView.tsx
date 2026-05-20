"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  IconAlertCircle,
  IconLoader2,
  IconMail,
  IconPencil,
  IconPlus,
  IconSend,
  IconTrash,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";
import { formatDateTime, formatNumber } from "@/lib/admin-format";

type TabKey = "templates" | "send" | "history" | "lifecycle";
type Channel = "email" | "telegram" | string;

const TABS: ReadonlyArray<{ key: TabKey; label: string }> = [
  { key: "templates", label: "Templates" },
  { key: "send", label: "Send" },
  { key: "history", label: "History" },
  { key: "lifecycle", label: "Lifecycle" },
];

function isTabKey(v: string | null): v is TabKey {
  return v === "templates" || v === "send" || v === "history" || v === "lifecycle";
}

export function CommunicationsSectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabKey = isTabKey(rawTab) ? rawTab : "templates";

  const switchTab = (key: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "templates") params.delete("tab");
    else params.set("tab", key);
    const qs = params.toString();
    router.replace(`/admin/communications${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Communications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Email + Telegram templates, bulk send with 2-phase
          confirmation, history, and lifecycle triggers.
        </p>
      </header>

      <nav
        aria-label="Communications tabs"
        className="-mx-4 overflow-x-auto border-b border-border bg-[#0a0a0a]/95 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
      >
        <ul className="flex min-w-max gap-1">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => switchTab(key)}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "relative inline-flex h-11 items-center px-3 text-sm font-medium",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {label}
                  {isActive && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 -bottom-px h-0.5 bg-emerald"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <section>
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "send" && <SendTab />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "lifecycle" && <LifecycleTab />}
      </section>
    </div>
  );
}

// ----- Templates ----------------------------------------------------

interface Template {
  id: string;
  kind?: Channel | null;
  name?: string | null;
  subject?: string | null;
  body?: string | null;
  version?: number | null;
  updated_at?: string | null;
  created_at?: string | null;
}

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "/api/proxy/admin/communications/templates",
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as Template[])
        : data && typeof data === "object"
          ? ((data as { templates?: Template[] }).templates ?? [])
          : [];
      setTemplates(list);
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
        `/api/proxy/admin/communications/templates/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTemplates((prev) => prev.filter((t) => t.id !== confirmDelete.id));
      setToast({ message: "Template deleted", tone: "success" });
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
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Templates
        </h2>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
        >
          <IconPlus size={13} stroke={2} aria-hidden />
          New template
        </button>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading templates…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No templates yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Kind</th>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium text-right">Version</th>
                <th className="px-3 py-2 font-medium">Updated</th>
                <th className="w-[80px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 text-sm text-foreground">
                    {t.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
                    {t.kind ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {t.subject ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                    v{t.version ?? 1}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDateTime(t.updated_at ?? t.created_at)}
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(adding || editing) && (
        <TemplateModal
          template={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setAdding(false);
            setEditing(null);
            setToast({
              message: editing ? "Template saved" : "Template created",
              tone: "success",
            });
            await reload();
          }}
        />
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Delete this template?"
        description={confirmDelete?.name ?? undefined}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            Existing send history references this template — historical
            rows keep their snapshot, but no new sends can use it.
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

function TemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: Template | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const isEdit = template !== null;
  const [name, setName] = useState(template?.name ?? "");
  const [kind, setKind] = useState<Channel>(template?.kind ?? "email");
  const [subject, setSubject] = useState(template?.subject ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) {
      setError("Name and body are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        kind,
        subject: subject.trim() || null,
        body: body.trim(),
      };
      const url = isEdit
        ? `/api/proxy/admin/communications/templates/${encodeURIComponent(template!.id)}`
        : "/api/proxy/admin/communications/templates";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      title={isEdit ? "Edit template" : "New template"}
      description={
        isEdit
          ? `Saving creates a new version (v${(template?.version ?? 1) + 1})`
          : undefined
      }
      size="lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          </label>
          <label className="block sm:w-32">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Kind
            </span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
            >
              <option value="email">email</option>
              <option value="telegram">telegram</option>
            </select>
          </label>
        </div>
        {kind === "email" && (
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
            />
          </label>
        )}
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Body (markdown supported)
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            disabled={busy}
            className="mt-1 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground focus:border-emerald focus:outline-none"
          />
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
            {isEdit ? "Save new version" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ----- Send (bulk-email / bulk-telegram, 2-phase) ------------------

type BulkChannel = "email" | "telegram";
type RecipientMode = "all" | "csv";

interface BulkPreview {
  recipient_count?: number | null;
  count?: number | null;
  confirmation_token?: string | null;
  preview?: string | null;
  warnings?: string[] | null;
}

function SendTab() {
  const [channel, setChannel] = useState<BulkChannel>("email");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string>("");
  const [mode, setMode] = useState<RecipientMode>("all");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    fetch("/api/proxy/admin/communications/templates", { cache: "no-store" })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data: unknown) => {
        const list = Array.isArray(data)
          ? (data as Template[])
          : data && typeof data === "object"
            ? ((data as { templates?: Template[] }).templates ?? [])
            : [];
        setTemplates(list);
      })
      .catch(() => undefined);
  }, []);

  const filtered = templates.filter((t) =>
    channel === "email" ? t.kind !== "telegram" : t.kind !== "email",
  );

  const parsedEmails =
    mode === "csv"
      ? csvText
          .split(/[\n,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const endpoint =
    channel === "email"
      ? "/api/proxy/admin/communications/bulk-email"
      : "/api/proxy/admin/communications/bulk-telegram";

  const phase1 = async () => {
    if (!templateId) {
      setError("Pick a template.");
      return;
    }
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const body: Record<string, unknown> = {
        template_id: templateId,
        phase: "preview",
        recipients: mode === "all" ? "all" : parsedEmails,
      };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : null) ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setPreview((data ?? {}) as BulkPreview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setBusy(false);
    }
  };

  const phase2 = async () => {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        template_id: templateId,
        phase: "execute",
        recipients: mode === "all" ? "all" : parsedEmails,
      };
      if (preview.confirmation_token) {
        body.confirmation_token = preview.confirmation_token;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          (data && typeof data === "object" && "message" in data
            ? String((data as { message: unknown }).message)
            : null) ?? `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setToast({ message: "Send queued", tone: "success" });
      setPreview(null);
      setCsvText("");
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Send failed · ${err.message}` : "Send failed",
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setChannel("email")}
          aria-pressed={channel === "email"}
          className={[
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium",
            channel === "email"
              ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <IconMail size={12} stroke={1.75} aria-hidden />
          Email
        </button>
        <button
          type="button"
          onClick={() => setChannel("telegram")}
          aria-pressed={channel === "telegram"}
          className={[
            "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium",
            channel === "telegram"
              ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <IconSend size={12} stroke={1.75} aria-hidden />
          Telegram
        </button>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          Template
        </span>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
        >
          <option value="">— Pick a template —</option>
          {filtered.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name ?? t.id}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-xs uppercase tracking-wider text-muted-foreground">
          Recipients
        </legend>
        <div className="mt-1 flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
            <input
              type="radio"
              name="rcpt"
              value="all"
              checked={mode === "all"}
              onChange={() => setMode("all")}
            />
            All active members
          </label>
          <label className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
            <input
              type="radio"
              name="rcpt"
              value="csv"
              checked={mode === "csv"}
              onChange={() => setMode("csv")}
            />
            CSV (paste emails or chat-ids)
          </label>
        </div>
        {mode === "csv" && (
          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={4}
            placeholder="Comma- or newline-separated"
            className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
        )}
      </fieldset>

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      {!preview ? (
        <button
          type="button"
          onClick={() => void phase1()}
          disabled={busy || !templateId}
          className="inline-flex h-10 items-center gap-1.5 rounded-md bg-emerald px-4 text-sm font-semibold text-background hover:bg-emerald-hover disabled:opacity-60"
        >
          {busy && (
            <IconLoader2
              size={14}
              stroke={2}
              className="animate-spin"
              aria-hidden
            />
          )}
          Preview send
        </button>
      ) : (
        <section className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] p-5">
          <header>
            <h3 className="text-sm font-semibold text-amber-200">
              Phase 2 confirmation
            </h3>
            <p className="mt-1 text-xs text-amber-200/90">
              About to send to{" "}
              <strong>
                {formatNumber(preview.recipient_count ?? preview.count) ??
                  "?"}{" "}
                recipients
              </strong>
              . This can&apos;t be undone.
            </p>
          </header>
          {preview.warnings && preview.warnings.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-amber-200/90">
              {preview.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          )}
          {preview.preview && (
            <pre className="mt-3 whitespace-pre-wrap rounded-md border border-amber-500/30 bg-background px-3 py-2 font-mono text-[11px] text-foreground">
              {preview.preview}
            </pre>
          )}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={busy}
              className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void phase2()}
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
              Send now
            </button>
          </div>
        </section>
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

// ----- History ------------------------------------------------------

interface SendHistoryEntry {
  id: string;
  channel?: Channel | null;
  template_id?: string | null;
  template_name?: string | null;
  sent_at?: string | null;
  recipient_count?: number | null;
  success_count?: number | null;
  failure_count?: number | null;
}

function HistoryTab() {
  const [items, setItems] = useState<SendHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(
      `/api/proxy/admin/communications/send-history?page=${page}&limit=50`,
      { cache: "no-store" },
    )
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        let list: SendHistoryEntry[] = [];
        if (Array.isArray(data)) list = data as SendHistoryEntry[];
        else if (data && typeof data === "object") {
          const d = data as {
            items?: SendHistoryEntry[];
            history?: SendHistoryEntry[];
            pages?: number;
          };
          list = d.items ?? d.history ?? [];
          if (typeof d.pages === "number") setPages(d.pages);
        }
        setItems(list);
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
  }, [page]);

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        Send history
      </h2>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No sends recorded.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Sent</th>
                <th className="px-3 py-2 font-medium">Template</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium text-right">Sent to</th>
                <th className="px-3 py-2 font-medium text-right">Success</th>
                <th className="px-3 py-2 font-medium text-right">Failed</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                    {formatDateTime(h.sent_at)}
                  </td>
                  <td className="px-3 py-2 text-xs text-foreground">
                    {h.template_name ?? h.template_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground">
                    {h.channel ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">
                    {formatNumber(h.recipient_count)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-emerald">
                    {formatNumber(h.success_count)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-red-300">
                    {formatNumber(h.failure_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
              className="inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-foreground disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Lifecycle ----------------------------------------------------

interface LifecycleMapping {
  trigger: string;
  template_id?: string | null;
  template_name?: string | null;
  enabled?: boolean | null;
}

function LifecycleTab() {
  const [mappings, setMappings] = useState<LifecycleMapping[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingTrigger, setSavingTrigger] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/proxy/admin/communications/lifecycle-configs", {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/proxy/admin/communications/templates", {
        cache: "no-store",
      }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cfg, tpl]) => {
        if (cancelled) return;
        const cfgList = Array.isArray(cfg)
          ? (cfg as LifecycleMapping[])
          : cfg && typeof cfg === "object"
            ? ((cfg as { mappings?: LifecycleMapping[] }).mappings ?? [])
            : [];
        setMappings(cfgList);
        const tplList = Array.isArray(tpl)
          ? (tpl as Template[])
          : tpl && typeof tpl === "object"
            ? ((tpl as { templates?: Template[] }).templates ?? [])
            : [];
        setTemplates(tplList);
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

  const save = async (m: LifecycleMapping) => {
    setSavingTrigger(m.trigger);
    try {
      const res = await fetch(
        "/api/proxy/admin/communications/lifecycle-configs",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger: m.trigger,
            template_id: m.template_id,
            enabled: m.enabled,
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMappings((prev) =>
        prev.map((p) => (p.trigger === m.trigger ? m : p)),
      );
      setToast({ message: `${m.trigger} updated`, tone: "success" });
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? `Save failed · ${err.message}` : "Save failed",
        tone: "error",
      });
    } finally {
      setSavingTrigger(null);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Lifecycle triggers
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Each event maps to one template. Toggling off disables the
          automatic send.
        </p>
      </header>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2 size={12} stroke={2} className="animate-spin" aria-hidden />
          Loading…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          {error}
        </p>
      ) : mappings.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No lifecycle triggers configured.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Trigger</th>
                <th className="px-3 py-2 font-medium">Template</th>
                <th className="px-3 py-2 font-medium">Enabled</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.trigger} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-foreground">
                    {m.trigger}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={m.template_id ?? ""}
                      onChange={(e) =>
                        void save({ ...m, template_id: e.target.value || null })
                      }
                      disabled={savingTrigger === m.trigger}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-emerald focus:outline-none"
                    >
                      <option value="">— None —</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name ?? t.id}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={Boolean(m.enabled)}
                      onChange={(e) =>
                        void save({ ...m, enabled: e.target.checked })
                      }
                      disabled={savingTrigger === m.trigger}
                      className="size-4"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Toast value={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
