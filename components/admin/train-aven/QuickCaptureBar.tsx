"use client";

// QuickCaptureBar — visual parity with the dashboard AvenChat input.
//
// What changed in this pass:
//   · The form itself is now visually bare — the parent (TrainStudio
//     input strip) provides the bg-surface-elevated + border-t frame
//     so the input area reads as a clean defined surface instead of
//     a dark blob with another dark blob inside it.
//   · Buttons follow the dashboard sizing (size-11, border-2) so the
//     admin chatbox reads as a sibling of the member chatbox.
//   · Textarea gets its own visible bg-background + rounded-2xl
//     border-border with focus:border-emerald — so the founder
//     actually sees where to type, not a transparent slab.
//   · Recording state mirrors the dashboard exactly: textarea is
//     swapped for an emerald-rimmed status panel with animated
//     SoundWaveBars + a live "Recording 0:12" timer + cancel-button
//     hint. Mic morphs to stop with an emerald ping ring.
//   · Cancel button (red X) appears during recording so the founder
//     can discard a take without sending.

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

function formatRecordingDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function SoundWaveBars() {
  // Five emerald bars on three offset curves — same animation the
  // dashboard chat uses; ports the keyframes inline so the admin
  // bar doesn't depend on global stylesheet ordering.
  const curves = [
    { name: "pt-admin-wave-a", delay: "0ms" },
    { name: "pt-admin-wave-b", delay: "120ms" },
    { name: "pt-admin-wave-c", delay: "240ms" },
    { name: "pt-admin-wave-a", delay: "360ms" },
    { name: "pt-admin-wave-b", delay: "480ms" },
  ];
  return (
    <span aria-hidden className="flex h-6 items-center gap-[3px]">
      {curves.map((c, i) => (
        <span
          key={i}
          className="block w-[3px] rounded-full bg-emerald"
          style={{
            animation: `${c.name} 0.9s ease-in-out infinite`,
            animationDelay: c.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes pt-admin-wave-a { 0%, 100% { height: 4px; } 50% { height: 20px; } }
        @keyframes pt-admin-wave-b { 0%, 100% { height: 8px; } 50% { height: 24px; } }
        @keyframes pt-admin-wave-c { 0%, 100% { height: 6px; } 50% { height: 14px; } }
      `}</style>
    </span>
  );
}

export function QuickCaptureBar({ onSend, busy }: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

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

  // Live elapsed counter while recording. Resets to 0 the moment
  // recording toggles off so the panel doesn't flash stale values
  // the next time round.
  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    setElapsed(0);
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [recording]);

  const teardownStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const stopRecording = (autoSend: boolean) => {
    const rec = recorderRef.current;
    if (!rec) return;
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      teardownStream();
      setRecording(false);
      if (autoSend && blob.size > 0) {
        void onSend({ audio: blob });
      } else {
        setRecordedBlob(blob);
      }
    };
    rec.stop();
  };

  const cancelRecording = () => {
    const rec = recorderRef.current;
    if (!rec) {
      setRecording(false);
      return;
    }
    rec.onstop = () => {
      teardownStream();
      setRecording(false);
      // No blob saved, no send — the take is discarded.
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
    if (busy || recording) return;
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
  const canSend = (hasText || hasAttachment) && !recording;

  return (
    <form onSubmit={submit} className="space-y-2">
      {(pendingImage || recordedBlob) && (
        <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
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
        {/* Mic — morphs to stop with an emerald ping ring while
            recording. Matches the dashboard chat's visual exactly. */}
        <button
          type="button"
          onClick={toggleMic}
          disabled={busy}
          aria-label={recording ? "Stop recording and send" : "Start voice recording"}
          className={[
            "relative inline-flex shrink-0 items-center justify-center rounded-full border-2 transition-all",
            recording
              ? "size-12 border-emerald bg-emerald/[0.22] text-emerald shadow-[0_0_32px_-2px_rgba(16,185,129,0.85)]"
              : "size-11 border-border bg-background text-muted-foreground hover:border-emerald/40 hover:text-foreground",
            busy ? "opacity-50" : "",
          ].join(" ")}
        >
          {recording && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-full border-2 border-emerald/60 animate-ping"
              style={{ animationDuration: "1.3s" }}
            />
          )}
          {recording ? (
            <IconPlayerStopFilled size={16} stroke={2} />
          ) : (
            <IconMicrophone size={18} stroke={1.75} />
          )}
        </button>

        {/* Cancel — appears only during recording so the founder can
            discard a take without sending it. */}
        {recording && (
          <button
            type="button"
            onClick={cancelRecording}
            aria-label="Cancel recording"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-red-400/40 bg-background text-red-300 transition-colors hover:bg-red-500/[0.08]"
          >
            <IconX size={18} stroke={1.75} />
          </button>
        )}

        {/* Camera — admin-only addition vs the dashboard input. Hidden
            during recording so the row reads as the recording panel
            alone. */}
        {!recording && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              aria-label="Attach image"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-muted-foreground transition-colors hover:border-emerald/40 hover:text-foreground disabled:opacity-50"
            >
              <IconCamera size={16} stroke={1.75} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImagePick}
              className="hidden"
            />
          </>
        )}

        {/* Input area — textarea swaps for an emerald-rimmed status
            panel while recording, same pattern as dashboard. */}
        {recording ? (
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-[44px] flex-1 items-center gap-3 rounded-2xl border-2 border-emerald/60 bg-emerald/[0.06] px-4 shadow-[0_0_24px_-6px_rgba(16,185,129,0.45)]"
          >
            <SoundWaveBars />
            <span className="font-mono text-sm font-semibold text-emerald">
              Recording {formatRecordingDuration(elapsed)}
            </span>
            <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
              Tap mic to send · X to cancel
            </span>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Message Aven"
            disabled={busy}
            className="block max-h-32 min-h-[44px] w-full flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 focus:border-emerald focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald disabled:opacity-50 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-track]:bg-transparent"
          />
        )}

        {/* Send — solid emerald circle, matches dashboard exactly.
            Disabled until there's content; hidden during recording
            since stop-mic is the send trigger then. */}
        <button
          type="submit"
          disabled={!canSend || busy}
          aria-label="Send"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald text-background transition-colors hover:bg-emerald-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          <IconSend2 size={18} stroke={2} />
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
