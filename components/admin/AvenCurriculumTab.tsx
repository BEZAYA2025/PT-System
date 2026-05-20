"use client";

import { useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconBookmark,
  IconCircleCheck,
  IconCircleDashed,
  IconLoader2,
  IconMicrophone,
  IconMicrophoneOff,
} from "@tabler/icons-react";

interface CurriculumTopic {
  id: string;
  topic?: string | null;
  description?: string | null;
  status?: "covered" | "pending" | "in_progress" | string | null;
  voice_note_recorded?: boolean | null;
}

type StatusFilter = "all" | "covered" | "in_progress" | "pending";
type VoiceFilter = "all" | "yes" | "no";

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All status" },
  { key: "covered", label: "Covered" },
  { key: "in_progress", label: "In progress" },
  { key: "pending", label: "Pending" },
];

const VOICE_FILTERS: Array<{ key: VoiceFilter; label: string }> = [
  { key: "all", label: "Any voice" },
  { key: "yes", label: "Voice ✓" },
  { key: "no", label: "Voice ✗" },
];

function statusClass(s: string | null | undefined): {
  bg: string;
  text: string;
  label: string;
} {
  const v = (s ?? "pending").toLowerCase();
  if (v === "covered")
    return {
      bg: "border-emerald/30 bg-emerald/[0.06]",
      text: "text-emerald",
      label: "Covered",
    };
  if (v === "in_progress")
    return {
      bg: "border-amber-500/30 bg-amber-500/[0.06]",
      text: "text-amber-300",
      label: "In progress",
    };
  return {
    bg: "border-border bg-surface",
    text: "text-muted-foreground",
    label: "Pending",
  };
}

export function AvenCurriculumTab() {
  const [topics, setTopics] = useState<CurriculumTopic[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [voiceFilter, setVoiceFilter] = useState<VoiceFilter>("all");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/proxy/admin/aven/curriculum", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as CurriculumTopic[])
          : data && typeof data === "object"
            ? ((data as { topics?: CurriculumTopic[] }).topics ?? [])
            : [];
        setTopics(list);
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

  const filtered = useMemo(() => {
    if (!topics) return [];
    return topics.filter((t) => {
      const s = (t.status ?? "pending").toLowerCase();
      if (statusFilter !== "all" && s !== statusFilter) return false;
      if (voiceFilter === "yes" && !t.voice_note_recorded) return false;
      if (voiceFilter === "no" && t.voice_note_recorded) return false;
      return true;
    });
  }, [topics, statusFilter, voiceFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Pills
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <Pills
          options={VOICE_FILTERS}
          value={voiceFilter}
          onChange={setVoiceFilter}
          tone="amber"
        />
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconLoader2
            size={12}
            stroke={2}
            className="animate-spin"
            aria-hidden
          />
          Loading curriculum…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
          <IconAlertCircle size={12} stroke={1.75} aria-hidden />
          Couldn&apos;t load · {error}
        </p>
      ) : !topics || filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No topics match the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => {
            const tone = statusClass(t.status);
            const VoiceIcon = t.voice_note_recorded
              ? IconMicrophone
              : IconMicrophoneOff;
            const StatusIcon =
              (t.status ?? "pending").toLowerCase() === "covered"
                ? IconCircleCheck
                : IconCircleDashed;
            return (
              <article
                key={t.id}
                className={`rounded-xl border ${tone.bg} p-4`}
              >
                <header className="flex items-start justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <IconBookmark
                      size={13}
                      stroke={1.75}
                      className="text-muted-foreground"
                      aria-hidden
                    />
                    {t.topic ?? "—"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone.text}`}
                  >
                    <StatusIcon size={10} stroke={2} aria-hidden />
                    {tone.label}
                  </span>
                </header>
                {t.description && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.description}
                  </p>
                )}
                <p
                  className={[
                    "mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider",
                    t.voice_note_recorded
                      ? "text-emerald"
                      : "text-muted-foreground",
                  ].join(" ")}
                >
                  <VoiceIcon size={11} stroke={1.75} aria-hidden />
                  {t.voice_note_recorded
                    ? "Voice note recorded"
                    : "Voice pending"}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pills<T extends string>({
  options,
  value,
  onChange,
  tone = "emerald",
}: {
  options: ReadonlyArray<{ key: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  tone?: "emerald" | "amber";
}) {
  const activeClass =
    tone === "amber"
      ? "border-amber-500/40 bg-amber-500/[0.08] text-amber-200"
      : "border-emerald/40 bg-emerald/[0.08] text-emerald";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={value === key}
          className={[
            "inline-flex h-7 items-center rounded-full border px-3 text-xs font-medium transition-colors",
            value === key
              ? activeClass
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
