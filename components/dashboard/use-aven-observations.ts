"use client";

import { useEffect, useState } from "react";

// Round-19: subscribe to the live observations SSE stream and expose
// a rolling buffer of the most recent N items. Falls back to whatever
// mock strings the caller passes when the stream isn't producing
// data — that way the Aven bar always has something to rotate
// through, even before VPS ships `/api/aven/observations` to every
// member or during a brief network blip.
//
// Stream contract (per VPS spec):
//   event: observation
//   data: { "id": "obs-2026-…", "text": "Watching BTC 4H bull-cross", "ts": "…" }
//
// The hook is permissive on the shape — id can be anything stringable,
// text is the rendered string. Older / shorter shapes (data is just a
// raw string) are accepted too. Anything unparseable is silently
// dropped.

const BUFFER_SIZE = 8;

interface Observation {
  id: string;
  text: string;
}

interface Result {
  /** Strings ready to feed the rotator. Real observations when SSE
   *  is producing; otherwise the caller-supplied mock fallback. */
  observations: ReadonlyArray<string>;
  /** True while the EventSource is open and has emitted at least one
   *  parseable observation. Drives the "live"/"mock" indicator in
   *  the bar's status dot. */
  connected: boolean;
}

function shapeObservation(raw: unknown): Observation | null {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return { id: `inline-${raw.slice(0, 32)}`, text: raw.trim() };
  }
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const text =
    typeof t.text === "string" && t.text.trim().length > 0
      ? t.text.trim()
      : typeof t.message === "string" && t.message.trim().length > 0
        ? t.message.trim()
        : typeof t.body === "string" && t.body.trim().length > 0
          ? t.body.trim()
          : null;
  if (!text) return null;
  const idRaw = t.id ?? t.observation_id ?? text;
  const id =
    typeof idRaw === "number"
      ? String(idRaw)
      : typeof idRaw === "string" && idRaw.length > 0
        ? idRaw
        : null;
  if (!id) return null;
  return { id, text };
}

export function useAvenObservations(
  fallback: ReadonlyArray<string>,
): Result {
  const [buffer, setBuffer] = useState<Observation[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const es = new EventSource("/api/proxy/aven/observations");
    let cancelled = false;

    const accept = (raw: unknown) => {
      const obs = shapeObservation(raw);
      if (!obs || cancelled) return;
      setBuffer((prev) => {
        if (prev.some((o) => o.id === obs.id)) return prev;
        const next = [obs, ...prev];
        return next.slice(0, BUFFER_SIZE);
      });
      setConnected(true);
    };

    const onMessage = (ev: MessageEvent) => {
      try {
        accept(JSON.parse(ev.data));
      } catch {
        // Treat unparseable data as a raw string observation rather
        // than dropping it entirely.
        accept(ev.data);
      }
    };

    es.addEventListener("observation", onMessage);
    // Some backend SSE variants emit unnamed messages. Listen to the
    // default `message` event too so we capture either shape.
    es.onmessage = onMessage;

    es.onerror = () => {
      // EventSource auto-reconnects; just flip our `connected` flag
      // so callers can show a "fallback" state if they want. We don't
      // close the stream — let the browser keep trying.
      setConnected(false);
    };

    return () => {
      cancelled = true;
      es.close();
    };
  }, []);

  const observations =
    connected && buffer.length > 0
      ? buffer.map((o) => o.text)
      : fallback;

  return { observations, connected };
}
