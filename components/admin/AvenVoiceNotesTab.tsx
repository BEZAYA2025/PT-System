"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconAlertCircle,
  IconCircleDot,
  IconFileUpload,
  IconLoader2,
  IconMicrophone,
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconPlus,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Modal } from "@/components/Modal";
import { Toast, type ToastState } from "@/components/Toast";

// Defensive shape — backend may evolve, optional everywhere.
interface VoiceNoteConcept {
  type?: "principle" | "trade_rule" | "market_observation" | string | null;
  text?: string | null;
  confidence?: number | null;
}

interface VoiceNoteTranscript {
  text?: string | null;
  language?: string | null;
}

interface VoiceNote {
  id: string;
  title?: string | null;
  tags?: string[] | string | null;
  audio_url?: string | null;
  audio_path?: string | null;
  duration_seconds?: number | null;
  status?: "processing" | "ready" | "failed" | string | null;
  transcript?: VoiceNoteTranscript | string | null;
  concepts?: VoiceNoteConcept[] | null;
  created_at?: string | null;
  updated_at?: string | null;
}

function normalizeTags(t: VoiceNote["tags"]): string[] {
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

function transcriptText(
  t: VoiceNoteTranscript | string | null | undefined,
): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  return t.text ?? "";
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

function formatDuration(s: number | null | undefined): string {
  if (s === null || s === undefined || s <= 0) return "—";
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${sec}`;
}

function statusTone(s: string | null | undefined): {
  pill: string;
  label: string;
} {
  const v = (s ?? "ready").toLowerCase();
  if (v === "processing")
    return {
      pill: "border-amber-500/30 bg-amber-500/[0.08] text-amber-200",
      label: "Processing",
    };
  if (v === "failed")
    return {
      pill: "border-red-400/40 bg-red-500/[0.08] text-red-300",
      label: "Failed",
    };
  return {
    pill: "border-emerald/30 bg-emerald/[0.08] text-emerald",
    label: "Ready",
  };
}

function conceptTypeTone(t: string | null | undefined): string {
  const v = (t ?? "").toLowerCase();
  if (v === "principle")
    return "border-emerald/30 bg-emerald/[0.06] text-emerald";
  if (v === "trade_rule")
    return "border-sky-400/30 bg-sky-400/[0.06] text-sky-300";
  if (v === "market_observation")
    return "border-amber-500/30 bg-amber-500/[0.06] text-amber-200";
  return "border-border bg-surface text-muted-foreground";
}

const POLL_INTERVAL_MS = 10_000;

export function AvenVoiceNotesTab() {
  const [notes, setNotes] = useState<VoiceNote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<VoiceNote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VoiceNote | null>(null);
  const [detail, setDetail] = useState<VoiceNote | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const reload = async () => {
    try {
      const res = await fetch("/api/proxy/admin/aven/voice-notes", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json().catch(() => null);
      const list = Array.isArray(data)
        ? (data as VoiceNote[])
        : data && typeof data === "object"
          ? ((data as { voice_notes?: VoiceNote[]; items?: VoiceNote[] })
              .voice_notes ??
              (data as { items?: VoiceNote[] }).items ??
              [])
          : [];
      setNotes(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  // Poll while any note is still in "processing" — Whisper +
  // concept-extraction is async on the backend. Stops once
  // everything's settled to avoid hammering the endpoint.
  useEffect(() => {
    if (!notes) return;
    const anyProcessing = notes.some(
      (n) => (n.status ?? "").toLowerCase() === "processing",
    );
    if (!anyProcessing) return;
    const id = window.setInterval(() => {
      void reload();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [notes]);

  const handleDelete = async () => {
    if (!confirmDelete || busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/proxy/admin/aven/voice-notes/${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNotes((prev) =>
        (prev ?? []).filter((n) => n.id !== confirmDelete.id),
      );
      setToast({ message: "Voice note deleted", tone: "success" });
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
            Voice Notes Library
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            DNA recordings Aven transcribes + extracts trading
            principles from.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
        >
          <IconPlus size={13} stroke={2} aria-hidden />
          Record New
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
          Loading voice notes…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      ) : !notes || notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No voice notes yet. Record one to teach Aven your methodology.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface/40">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-[90px] px-3 py-2 font-medium">Audio</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Tags</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Concepts</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="w-[80px] px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {notes.map((n) => {
                const tags = normalizeTags(n.tags);
                const tone = statusTone(n.status);
                const conceptCount = (n.concepts ?? []).length;
                const audio = n.audio_url ?? n.audio_path ?? null;
                return (
                  <tr
                    key={n.id}
                    onClick={() => setDetail(n)}
                    className="cursor-pointer border-b border-border/40 transition-colors last:border-0 hover:bg-surface/60"
                  >
                    <td className="px-3 py-2">
                      {audio ? (
                        <InlineAudio src={audio} />
                      ) : (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          —
                        </span>
                      )}
                      {n.duration_seconds && (
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                          {formatDuration(n.duration_seconds)}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-foreground">
                      {n.title ?? "Untitled"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {tags.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : (
                          tags.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                            >
                              {t}
                            </span>
                          ))
                        )}
                        {tags.length > 3 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
                      >
                        {(n.status ?? "").toLowerCase() === "processing" && (
                          <IconLoader2
                            size={10}
                            stroke={2}
                            className="animate-spin"
                            aria-hidden
                          />
                        )}
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {conceptCount}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(n.created_at)}
                    </td>
                    <td
                      className="px-2 py-2"
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={() => setEditing(n)}
                          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground"
                        >
                          <IconPencil size={12} stroke={1.75} aria-hidden />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete"
                          onClick={() => setConfirmDelete(n)}
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
        <VoiceNoteAddModal
          onClose={() => setAddOpen(false)}
          onCreated={async () => {
            setAddOpen(false);
            setToast({
              message: "Uploading + transcribing… (~30s)",
              tone: "success",
            });
            await reload();
          }}
        />
      )}

      {editing && (
        <VoiceNoteEditModal
          note={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setToast({ message: "Voice note updated", tone: "success" });
            await reload();
          }}
        />
      )}

      {detail && (
        <VoiceNoteDetailModal
          note={detail}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing(detail);
            setDetail(null);
          }}
          onDelete={() => {
            setConfirmDelete(detail);
            setDetail(null);
          }}
        />
      )}

      <Modal
        open={confirmDelete !== null}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Delete this voice note?"
        description={confirmDelete?.title ?? undefined}
        size="sm"
      >
        <div className="space-y-4 text-sm text-foreground">
          <p>
            The audio file, transcript, and extracted concepts are
            removed permanently.
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

// Tiny audio play/pause control for the table row. Uses a hidden
// <audio> element + button so the row click can still propagate
// to open the detail modal (stopPropagation on button only).
function InlineAudio({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      void el.play().catch(() => undefined);
    }
  };
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPauseOrEnd = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPauseOrEnd);
    el.addEventListener("ended", onPauseOrEnd);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPauseOrEnd);
      el.removeEventListener("ended", onPauseOrEnd);
    };
  }, []);
  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="inline-flex size-8 items-center justify-center rounded-full border border-border bg-background text-emerald hover:border-emerald/40"
      >
        {playing ? (
          <IconPlayerPause size={14} stroke={1.75} aria-hidden />
        ) : (
          <IconPlayerPlay size={14} stroke={1.75} aria-hidden />
        )}
      </button>
      <audio ref={audioRef} src={src} preload="none" />
    </span>
  );
}

function VoiceNoteAddModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}) {
  const [mode, setMode] = useState<"record" | "upload">("record");
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopTracksAndTicks = () => {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount — abort an in-flight recording so the
      // mic indicator drops the moment the modal closes.
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopTracksAndTicks();
    };
  }, []);

  const startRecording = async () => {
    setRecorderError(null);
    setRecordedBlob(null);
    setRecordSeconds(0);
    chunksRef.current = [];
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        throw new Error("Mic API not available in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        setRecordedBlob(blob);
        stopTracksAndTicks();
      };
      rec.start();
      setRecording(true);
      tickRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setRecorderError(
        err instanceof Error ? err.message : "Mic access denied",
      );
      stopTracksAndTicks();
    }
  };

  const stopRecording = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setRecording(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setSubmitError("Title is required.");
      return;
    }
    const audioBlob =
      mode === "record" ? recordedBlob : file ?? null;
    if (!audioBlob) {
      setSubmitError(
        mode === "record"
          ? "Record an audio clip before submitting."
          : "Pick an audio file.",
      );
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      const tags = parseTagsInput(tagsInput);
      if (tags.length > 0) fd.append("tags", tags.join(","));
      const fileName =
        audioBlob instanceof File
          ? audioBlob.name
          : `voice-note-${Date.now()}.webm`;
      const blobForUpload =
        audioBlob instanceof File
          ? audioBlob
          : new File([audioBlob], fileName, {
              type: audioBlob.type || "audio/webm",
            });
      fd.append("audio", blobForUpload);
      const res = await fetch("/api/proxy/admin/aven/voice-notes", {
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
      await onCreated();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const recordedUrl = recordedBlob
    ? URL.createObjectURL(recordedBlob)
    : null;
  // Free the object URL when the blob changes.
  useEffect(() => {
    return () => {
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  return (
    <Modal
      open
      onClose={() => !busy && onClose()}
      title="Record voice note"
      size="md"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("record")}
            className={[
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium",
              mode === "record"
                ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                : "border-border bg-background text-foreground",
            ].join(" ")}
          >
            <IconMicrophone size={13} stroke={1.75} aria-hidden />
            Record
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={[
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-medium",
              mode === "upload"
                ? "border-emerald/40 bg-emerald/[0.08] text-emerald"
                : "border-border bg-background text-foreground",
            ].join(" ")}
          >
            <IconFileUpload size={13} stroke={1.75} aria-hidden />
            Upload
          </button>
        </div>

        {mode === "record" ? (
          <div className="rounded-lg border border-border bg-background p-4">
            {recorderError ? (
              <p className="text-xs text-red-300">{recorderError}</p>
            ) : recording ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-flex items-center gap-2 font-mono text-sm text-red-300">
                  <IconCircleDot
                    size={14}
                    stroke={2}
                    className="animate-pulse text-red-400"
                    aria-hidden
                  />
                  Recording · {formatDuration(recordSeconds)}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-400/40 bg-red-500/[0.08] px-3 text-xs font-semibold text-red-200 hover:bg-red-500/[0.14]"
                >
                  <IconPlayerStop size={13} stroke={1.75} aria-hidden />
                  Stop
                </button>
              </div>
            ) : recordedBlob ? (
              <div className="flex flex-col items-center gap-3">
                {recordedUrl && (
                  /* eslint-disable-next-line jsx-a11y/media-has-caption */
                  <audio
                    src={recordedUrl}
                    controls
                    className="w-full"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setRecordedBlob(null);
                    setRecordSeconds(0);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <IconX size={11} stroke={1.75} />
                  Discard
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <IconMicrophone
                  size={22}
                  stroke={1.5}
                  className="text-muted-foreground"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald px-3 text-xs font-semibold text-background hover:bg-emerald-hover"
                >
                  <IconCircleDot size={13} stroke={1.75} aria-hidden />
                  Start recording
                </button>
                <p className="text-[11px] text-muted-foreground">
                  Browser will ask for mic permission.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (!f) return;
              if (!f.type.startsWith("audio/")) {
                setRecorderError("File must be audio.");
                return;
              }
              setRecorderError(null);
              setFile(f);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center"
          >
            {file ? (
              <>
                <span className="inline-flex items-center gap-2 font-mono text-xs text-foreground">
                  <IconFileUpload
                    size={14}
                    stroke={1.75}
                    aria-hidden
                  />
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
                  Drag-drop an audio file, or
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
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                  }}
                />
              </>
            )}
          </div>
        )}

        <label className="block">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            placeholder="Liquidation cascades, trader's edge, ..."
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
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
            placeholder="risk, psychology, btc"
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald focus:outline-none"
          />
        </label>

        {submitError && (
          <p className="rounded-md border border-red-400/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-200">
            {submitError}
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
            Upload + transcribe
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VoiceNoteEditModal({
  note,
  onClose,
  onSaved,
}: {
  note: VoiceNote;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [title, setTitle] = useState(note.title ?? "");
  const [tagsInput, setTagsInput] = useState(
    normalizeTags(note.tags).join(", "),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proxy/admin/aven/voice-notes/${encodeURIComponent(note.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
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
      title="Edit voice note"
      description="Title and tags only — audio re-upload not yet supported."
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
            Tags (comma-separated)
          </span>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            disabled={busy}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-emerald focus:outline-none"
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
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

function VoiceNoteDetailModal({
  note,
  onClose,
  onEdit,
  onDelete,
}: {
  note: VoiceNote;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = normalizeTags(note.tags);
  const audio = note.audio_url ?? note.audio_path ?? null;
  const tone = statusTone(note.status);
  const tText = transcriptText(note.transcript);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const concepts = note.concepts ?? [];
  const conceptsByType = new Map<string, VoiceNoteConcept[]>();
  for (const c of concepts) {
    const k = (c.type ?? "other").toString();
    const arr = conceptsByType.get(k) ?? [];
    arr.push(c);
    conceptsByType.set(k, arr);
  }
  return (
    <Modal
      open
      onClose={onClose}
      title={note.title ?? "Voice note"}
      description={`${formatDate(note.created_at)} · ${formatDuration(note.duration_seconds)}`}
      size="lg"
    >
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.pill}`}
          >
            {tone.label}
          </span>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {audio && (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <audio src={audio} controls className="w-full" />
        )}

        {tText && (
          <section>
            <header className="flex items-center justify-between gap-2">
              <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Transcript
              </h3>
              {tText.length > 280 && (
                <button
                  type="button"
                  onClick={() => setTranscriptOpen((v) => !v)}
                  className="text-[11px] text-emerald hover:text-emerald-hover"
                >
                  {transcriptOpen ? "Collapse" : "Expand"}
                </button>
              )}
            </header>
            <p
              className={[
                "mt-1 whitespace-pre-wrap rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
                transcriptOpen || tText.length <= 280
                  ? ""
                  : "line-clamp-4",
              ].join(" ")}
            >
              {tText}
            </p>
          </section>
        )}

        {concepts.length > 0 && (
          <section>
            <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Concepts ({concepts.length})
            </h3>
            <div className="mt-2 space-y-3">
              {Array.from(conceptsByType.entries()).map(([type, items]) => (
                <div key={type}>
                  <p
                    className={`mb-1 inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${conceptTypeTone(type)}`}
                  >
                    {type.replace(/_/g, " ")}
                  </p>
                  <ul className="space-y-1.5">
                    {items.map((c, i) => (
                      <li
                        key={i}
                        className="rounded-md border border-border/60 bg-background px-3 py-2 text-foreground"
                      >
                        {c.text ?? "—"}
                        {typeof c.confidence === "number" && (
                          <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                            {(c.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-between gap-2 pt-2">
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
