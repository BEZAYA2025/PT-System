"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  shapeChatPost,
  shapeHistoryResponse,
  shapeMessage,
  shapeQuota,
  type ChatMessage,
  type QuotaState,
  type SendStatus,
} from "@/lib/aven";

const POLLING_FALLBACK_INTERVAL_MS = 5_000;
const SSE_ERROR_THRESHOLD = 3;

interface UseAvenChatOptions {
  initialMessages: ChatMessage[];
  initialQuota?: QuotaState | null;
  /** SSR-known cursor — set when the initial /api/aven/history response had
   *  has_more=true. */
  initialHasOlder?: boolean;
}

interface VoiceState {
  recording: boolean;
  transcribing: boolean;
  supported: boolean;
  error: string | null;
}

export function useAvenChat({
  initialMessages,
  initialQuota = null,
  initialHasOlder,
}: UseAvenChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [quota, setQuota] = useState<QuotaState | null>(initialQuota);
  const [thinking, setThinking] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [voice, setVoice] = useState<VoiceState>({
    recording: false,
    transcribing: false,
    supported: true,
    error: null,
  });
  const [streamConnected, setStreamConnected] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState<boolean>(
    initialHasOlder ?? initialMessages.length >= 50,
  );

  // Refs ----------------------------------------------------------------------
  const dedupRef = useRef<Set<string>>(new Set());
  const lastChatIdRef = useRef<number>(0);
  const esRef = useRef<EventSource | null>(null);
  const sseErrorCountRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef<boolean>(false);

  // Helpers -------------------------------------------------------------------
  const trackHighestId = useCallback((id: string) => {
    const n = Number(id);
    if (Number.isFinite(n) && n > lastChatIdRef.current) {
      lastChatIdRef.current = n;
    }
  }, []);

  const appendIfNew = useCallback(
    (msg: ChatMessage) => {
      if (dedupRef.current.has(msg.id)) return;
      dedupRef.current.add(msg.id);
      trackHighestId(msg.id);
      setMessages((prev) => [...prev, msg]);
    },
    [trackHighestId],
  );

  // Seed dedup + cursor from initial messages on mount
  useEffect(() => {
    initialMessages.forEach((m) => {
      dedupRef.current.add(m.id);
      trackHighestId(m.id);
    });
    // Mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quota fetch ---------------------------------------------------------------
  const refreshQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/proxy/aven/quota", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      const shaped = shapeQuota(data);
      if (shaped) setQuota(shaped);
    } catch {
      // Silent — quota refresh is non-critical.
    }
  }, []);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  // SSE connection ------------------------------------------------------------
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollOnce = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/proxy/aven/history?since_id=${lastChatIdRef.current}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data) return;
      const list = Array.isArray(data)
        ? data
        : Array.isArray((data as { messages?: unknown }).messages)
          ? (data as { messages: unknown[] }).messages
          : [];
      list.forEach((raw) => {
        const msg = shapeMessage(raw);
        if (msg) appendIfNew(msg);
      });
    } catch {
      // Silent — polling errors are non-critical.
    }
  }, [appendIfNew]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = setInterval(
      () => void pollOnce(),
      POLLING_FALLBACK_INTERVAL_MS,
    );
  }, [pollOnce, stopPolling]);

  const closeStream = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  const openStream = useCallback(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      // Server-side or unsupported — fall back to polling immediately.
      startPolling();
      return;
    }
    closeStream();

    const params = new URLSearchParams({
      last_chat_id: String(lastChatIdRef.current),
    });
    const es = new EventSource(`/api/proxy/events?${params.toString()}`);
    esRef.current = es;

    es.addEventListener("open", () => {
      setStreamConnected(true);
      sseErrorCountRef.current = 0;
      stopPolling();
    });

    es.addEventListener("connected", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data ?? "{}");
        if (typeof data.last_chat_id === "number") {
          lastChatIdRef.current = Math.max(
            lastChatIdRef.current,
            data.last_chat_id,
          );
        }
      } catch {
        // ignore malformed payload
      }
    });

    es.addEventListener("chat.message", (e) => {
      try {
        const raw = JSON.parse((e as MessageEvent).data ?? "{}");
        const msg = shapeMessage(raw);
        if (msg) appendIfNew(msg);
      } catch {
        // ignore malformed payload
      }
    });

    es.addEventListener("notification.new", (e) => {
      // Notification handling lives in the bell — emit a global custom event
      // so the NotificationCenter can pick it up without a context provider.
      try {
        const raw = JSON.parse((e as MessageEvent).data ?? "{}");
        window.dispatchEvent(
          new CustomEvent("pt-system:notification", { detail: raw }),
        );
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      setStreamConnected(false);
      sseErrorCountRef.current += 1;
      if (sseErrorCountRef.current >= SSE_ERROR_THRESHOLD) {
        // Give up on SSE for now and switch to polling. EventSource will be
        // re-attempted by the page lifecycle on next mount.
        closeStream();
        startPolling();
      }
    };
  }, [appendIfNew, closeStream, startPolling, stopPolling]);

  useEffect(() => {
    openStream();
    return () => {
      closeStream();
      stopPolling();
    };
    // Mount only — openStream uses the latest refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send ----------------------------------------------------------------------
  const performSend = useCallback(
    async (content: string, localId: string) => {
      try {
        const res = await fetch("/api/proxy/aven/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Forward-compat per VPS spec: send `text` (canonical) AND `content`
          // (legacy) AND message_type so partial backend roll-outs both work.
          body: JSON.stringify({
            text: content,
            content,
            message_type: "user_text",
          }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // eslint-disable-next-line no-console
          console.error("[aven/chat] send failed", { status: res.status, data });

          if (res.status === 401) {
            setMessages((prev) =>
              prev.map((m) =>
                m.localId === localId
                  ? { ...m, status: "failed" as SendStatus }
                  : m,
              ),
            );
            setSendError("Sign in expired. Redirecting…");
            setTimeout(() => {
              window.location.href = "/signin";
            }, 800);
            return;
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.localId === localId ? { ...m, status: "failed" as SendStatus } : m,
            ),
          );

          const backendMsg =
            (typeof data?.message === "string" && data.message) ||
            (typeof data?.error === "string" && data.error) ||
            null;

          const byStatus: Record<number, string> = {
            400: "Message required.",
            413: "Message too long (max 4,000 chars).",
            429: "Daily limit reached. Upgrade to VIP for unlimited Aven.",
            502: "Aven is having trouble. Try again in a moment.",
          };

          setSendError(
            byStatus[res.status] ??
              (backendMsg
                ? `${backendMsg} (HTTP ${res.status})`
                : `Send failed — HTTP ${res.status}. Please try again.`),
          );
          return;
        }

        const result = shapeChatPost(data);

        setMessages((prev) => {
          const next = prev.map((m) => {
            if (m.localId !== localId) return m;
            // Replace the optimistic local row with the server-confirmed
            // user message id, but keep the local content/timestamp.
            if (result.userMessageId) {
              dedupRef.current.add(result.userMessageId);
              trackHighestId(result.userMessageId);
              return {
                ...m,
                id: result.userMessageId,
                content: result.userContentEcho ?? m.content,
                status: "sent" as SendStatus,
                localId: undefined,
              };
            }
            return { ...m, status: "sent" as SendStatus, localId: undefined };
          });
          if (
            result.avenMessageId &&
            result.reply &&
            !dedupRef.current.has(result.avenMessageId)
          ) {
            dedupRef.current.add(result.avenMessageId);
            trackHighestId(result.avenMessageId);
            next.push({
              id: result.avenMessageId,
              role: "aven",
              content: result.reply,
              ts: new Date().toISOString(),
              source: "web",
            });
          }
          return next;
        });

        if (result.quota) setQuota(result.quota);
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.localId === localId ? { ...m, status: "failed" as SendStatus } : m,
          ),
        );
        setSendError("Connection issue. Please try again.");
      } finally {
        setThinking(false);
      }
    },
    [trackHighestId],
  );

  const send = useCallback(
    async (textOverride?: string) => {
      const content = (textOverride ?? input).trim();
      if (!content) return;
      if (quota && !quota.allowed) {
        setSendError(
          "Daily limit reached. Upgrade to VIP for unlimited Aven.",
        );
        return;
      }

      const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const localMsg: ChatMessage = {
        id: localId,
        localId,
        role: "user",
        content,
        ts: new Date().toISOString(),
        source: "web",
        status: "sending",
      };

      setMessages((prev) => [...prev, localMsg]);
      setInput("");
      setThinking(true);
      setSendError(null);

      void performSend(content, localId);
    },
    [input, quota, performSend],
  );

  const retry = useCallback(
    async (localId: string) => {
      const failed = messages.find((m) => m.localId === localId);
      if (!failed) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.localId === localId ? { ...m, status: "sending" as SendStatus } : m,
        ),
      );
      setThinking(true);
      setSendError(null);
      void performSend(failed.content, localId);
    },
    [messages, performSend],
  );

  // Voice ---------------------------------------------------------------------
  const releaseRecorder = useCallback(() => {
    recorderRef.current = null;
    if (recorderStreamRef.current) {
      recorderStreamRef.current.getTracks().forEach((t) => t.stop());
      recorderStreamRef.current = null;
    }
    audioChunksRef.current = [];
  }, []);

  const startVoice = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setVoice({
        recording: false,
        transcribing: false,
        supported: false,
        error: "Voice input isn't supported in this browser.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderStreamRef.current = stream;
      recorderRef.current = recorder;
      audioChunksRef.current = [];
      cancelRecordingRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const cancelled = cancelRecordingRef.current;
        const chunks = audioChunksRef.current.slice();
        const mime = recorder.mimeType || "audio/webm";

        if (cancelled || chunks.length === 0) {
          releaseRecorder();
          setVoice((v) => ({ ...v, recording: false, transcribing: false }));
          return;
        }

        const blob = new Blob(chunks, { type: mime });
        const fd = new FormData();
        const ext = mime.includes("mp4")
          ? "mp4"
          : mime.includes("ogg")
            ? "ogg"
            : "webm";
        fd.append("audio", blob, `voice.${ext}`);

        setVoice((v) => ({ ...v, recording: false, transcribing: true }));
        releaseRecorder();

        try {
          const res = await fetch("/api/proxy/aven/voice", {
            method: "POST",
            body: fd,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const msg =
              typeof data?.message === "string"
                ? data.message
                : "Voice transcription failed.";
            setVoice({
              recording: false,
              transcribing: false,
              supported: true,
              error: msg,
            });
            return;
          }
          const transcribed: string =
            typeof data?.transcribed_text === "string"
              ? data.transcribed_text
              : typeof data?.text === "string"
                ? data.text
                : "";
          if (transcribed.length > 0) {
            setInput((prev) => (prev ? `${prev} ${transcribed}` : transcribed));
          }
          setVoice({
            recording: false,
            transcribing: false,
            supported: true,
            error: null,
          });
        } catch {
          setVoice({
            recording: false,
            transcribing: false,
            supported: true,
            error: "Connection issue while transcribing voice.",
          });
        }
      };

      recorder.start();
      setVoice({
        recording: true,
        transcribing: false,
        supported: true,
        error: null,
      });
    } catch (err) {
      const denied =
        err instanceof DOMException && err.name === "NotAllowedError";
      setVoice({
        recording: false,
        transcribing: false,
        supported: !denied,
        error: denied
          ? "Microphone access denied. Enable it in your browser settings to use voice."
          : "Couldn't start recording. Please try again.",
      });
    }
  }, [releaseRecorder]);

  const stopVoice = useCallback(() => {
    cancelRecordingRef.current = false;
    recorderRef.current?.stop();
  }, []);

  const cancelVoice = useCallback(() => {
    cancelRecordingRef.current = true;
    recorderRef.current?.stop();
  }, []);

  // Lazy-load older messages ----------------------------------------------
  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasOlder) return;
    // Lowest server-assigned id (skip optimistic local rows)
    const ids = messages
      .filter((m) => !m.localId)
      .map((m) => Number(m.id))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0) return;
    const oldest = Math.min(...ids);
    setLoadingOlder(true);
    try {
      const res = await fetch(
        `/api/proxy/aven/history?before_id=${oldest}&limit=50`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      const { messages: shaped, hasMore } = shapeHistoryResponse(data);
      const fresh = shaped.filter((m) => !dedupRef.current.has(m.id));
      fresh.forEach((m) => dedupRef.current.add(m.id));
      if (fresh.length === 0) {
        setHasOlder(false);
        return;
      }
      // Backend returns ASC; ensure prepend ordering matches existing sort.
      const sorted = fresh.slice().sort((a, b) => Number(a.id) - Number(b.id));
      setMessages((prev) => [...sorted, ...prev]);
      setHasOlder(hasMore);
    } finally {
      setLoadingOlder(false);
    }
  }, [hasOlder, loadingOlder, messages]);

  return {
    messages,
    quota,
    thinking,
    sendError,
    input,
    setInput,
    voice,
    streamConnected,
    loadingOlder,
    hasOlder,
    send,
    retry,
    loadOlder,
    startVoice,
    stopVoice,
    cancelVoice,
  };
}
