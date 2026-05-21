"use client";

// QuickCaptureBar — the always-available, casual input for Train-Aven
// Normal mode. One row, four affordances: mic (tap to start, tap to
// stop + send), camera (image upload), auto-growing textarea, and a
// SEND ARROW on the right where the founder expects it.
//
// Send arrow is always visible but disabled until there's content —
// that way the input row reads as a normal, complete chatbox and the
// affordance is unambiguous (not the "search-for-the-button" UX of
// iteration 2).
//
// Start-Training is NOT here anymore. It's a separate, deliberate
// button at the top of the studio so the input strip is purely about
// quick conversational capture.

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  IconCamera,
  IconMicrophone,
  IconPlayerStopFilled,
  IconSend2,
  IconX,
} from "@tabler/icons-react";

export interface CapturePayload {
  text?: string;
  audio?: Blob;
  image?: File;
}

interface Props {
  onSend: (payload: CapturePayload) => void | Promise<void>;
  busy?: boolean;
}

export function QuickCaptureBar({ onSend, busy }: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea (up to ~6 rows) so multi-line capture still
  // feels like a quick input, not a full editor.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  const stopRecording = (autoSend: boolean) => {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      if (autoSend && blob.size > 0) {
        void onSend({ audio: blob });
      } else {
        setRecordedBlob(blob);
      }
    };
    rec.stop();
  };

  const startRecording = async () => {
    if (busy) return;
    setRecordError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setRecordError(
        "Voice capture isn't supported in this browser. Try Chrome or Edge.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (err) {
      // getUserMedia throws DOMException with a specific `name` for
      // the permission denied case — much clearer to map that to a
      // human message than to surface the raw browser error string.
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: unknown }).name)
          : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setRecordError(
          "Microphone permission denied. Allow it in your browser settings, then tap the mic again.",
        );
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setRecordError(
          "No microphone found. Connect one and tap the mic again.",
        );
      } else {
        setRecordError(
          err instanceof Error
            ? `Mic error · ${err.message}`
            : "Couldn't start recording.",
        );
      }
    }
  };

  const toggleMic = () => {
    // Any tap on the mic clears a stale error and tries again — the
    // founder shouldn't have to hunt for a dismiss control to retry.
    setRecordError(null);
    if (recording) {
      stopRecording(true);
    } else {
      void startRecording();
    }
  };

  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) setPendingImage(file);
    e.target.value = "";
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    const trimmed = text.trim();
    const hasContent =
      trimmed.length > 0 || pendingImage !== null || recordedBlob !== null;
    if (!hasContent) return;
    const payload: CapturePayload = {};
    if (trimmed.length > 0) payload.text = trimmed;
    if (pendingImage) payload.image = pendingImage;
    if (recordedBlob) payload.audio = recordedBlob;
    void onSend(payload);
    setText("");
    setPendingImage(null);
    setRecordedBlob(null);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const hasText = text.trim().length > 0;
  const hasAttachment = pendingImage !== null || recordedBlob !== null;
  const canSend = hasText || hasAttachment;

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-surface p-2.5 transition-colors focus-within:border-emerald/40"
    >
      {(pendingImage || recordedBlob) && (
        <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
          {pendingImage && (
            <AttachmentChip
              label={pendingImage.name}
              icon={<IconCamera size={11} stroke={1.75} />}
              onRemove={() => setPendingImage(null)}
            />
          )}
          {recordedBlob && (
            <AttachmentChip
              label={`Voice note · ${Math.round(recordedBlob.size / 1024)}KB`}
              icon={<IconMicrophone size={11} stroke={1.75} />}
              onRemove={() => setRecordedBlob(null)}
            />
          )}
        </div>
      )}

      {recordError && (
        <div className="mb-2 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconMicrophone
            size={12}
            stroke={1.75}
            className="mt-0.5 shrink-0"
            aria-hidden
          />
          <p className="flex-1 leading-relaxed">{recordError}</p>
          <button
            type="button"
            onClick={() => setRecordError(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-full p-0.5 text-amber-300/70 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
          >
            <IconX size={11} stroke={2} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleMic}
            disabled={busy}
            aria-label={recording ? "Stop recording" : "Start voice recording"}
            className={[
              "inline-flex size-9 items-center justify-center rounded-full border transition-colors",
              recording
                ? "border-red-400/50 bg-red-500/[0.12] text-red-300"
                : "border-border bg-background text-muted-foreground hover:border-emerald/40 hover:text-foreground",
              busy ? "opacity-50" : "",
            ].join(" ")}
          >
            {recording ? (
              <IconPlayerStopFilled size={14} stroke={1.75} />
            ) : (
              <IconMicrophone size={14} stroke={1.75} />
            )}
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || recording}
            aria-label="Attach image"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-emerald/40 hover:text-foreground disabled:opacity-50"
          >
            <IconCamera size={14} stroke={1.75} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImagePick}
            className="hidden"
          />
        </div>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          placeholder={recording ? "Recording…" : "Message Aven"}
          disabled={busy || recording}
          // Custom scrollbar utility kills the native up/down arrow
          // buttons that Windows browsers render next to the text
          // field — those were the "kleine Hoch/Runter-Pfeile" Paul
          // wanted gone from the input strip.
          className="min-h-9 flex-1 resize-none rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent"
        />

        {/* Send arrow — always present so the input reads as a complete
            chatbox. Active when there's content, dimmed otherwise. */}
        <button
          type="submit"
          disabled={!canSend || busy}
          aria-label="Send"
          className={[
            "inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-all",
            canSend && !busy
              ? "bg-emerald text-background hover:bg-emerald-hover"
              : "border border-border bg-background text-muted-foreground/40",
          ].join(" ")}
        >
          <IconSend2 size={14} stroke={2} />
        </button>
      </div>
    </form>
  );
}

function AttachmentChip({
  label,
  icon,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
      {icon}
      <span className="max-w-[160px] truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove attachment"
        className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-surface hover:text-foreground"
      >
        <IconX size={10} stroke={2} />
      </button>
    </span>
  );
}
