"use client";

// QuickCaptureBar — the always-available, casual input for Train-Aven.
// One row, three affordances: text (auto-growing textarea), mic (tap
// to start, tap to stop + send), camera (image upload). The send
// arrow only materialises once there is actual content to send so
// the row reads as quiet at rest.
//
// Mock-friendly: parent owns the send callbacks. This component only
// captures input + manages the local recorder lifecycle.

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  onStartTraining: () => void;
  busy?: boolean;
}

export function QuickCaptureBar({ onSend, onStartTraining, busy }: Props) {
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
      setRecordError(
        err instanceof Error
          ? err.message
          : "Microphone access denied",
      );
    }
  };

  const toggleMic = () => {
    if (recording) {
      stopRecording(true);
    } else {
      void startRecording();
    }
  };

  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) setPendingImage(file);
    // Reset so picking the same file twice re-fires onChange
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
      className="rounded-2xl border border-border bg-surface/40 p-3 backdrop-blur-sm"
    >
      {/* Pending attachments preview — sits above the input row so the
          founder sees what's queued for the next send. */}
      {(pendingImage || recordedBlob) && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
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
        <p className="mb-2 text-xs text-amber-300">{recordError}</p>
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
          placeholder={
            recording
              ? "Recording…"
              : "Capture a thought, ask Aven, or hit Start Training"
          }
          disabled={busy || recording}
          className="min-h-9 flex-1 resize-none rounded-md border border-transparent bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-emerald/30 focus:outline-none disabled:opacity-50"
        />

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Start Training — always visible, the deliberate ritual
              entry into the immersive stage. */}
          <button
            type="button"
            onClick={onStartTraining}
            disabled={busy || recording}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/[0.08] px-3 text-xs font-semibold uppercase tracking-wider text-emerald transition-colors hover:bg-emerald/[0.14] disabled:opacity-50"
          >
            Start training
          </button>

          {/* Send arrow — materialises only when there's content. The
              quietness at rest is the point. */}
          <AnimatePresence>
            {canSend && (
              <motion.button
                key="send"
                type="submit"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                disabled={busy}
                aria-label="Send"
                className="inline-flex size-9 items-center justify-center rounded-full bg-emerald text-background hover:bg-emerald-hover disabled:opacity-50"
              >
                <IconSend2 size={14} stroke={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
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
