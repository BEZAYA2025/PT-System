// Defensive adapter for the Daily Brief payload — backend shape isn't
// confirmed yet. Reads several plausible paths and falls back to null when
// no usable content is found.

export interface RawBriefShape {
  generated_at?: string;
  language?: string;
  content_en?: string;
  summary_en?: string;

  // Nested under different parent keys observed during build.
  brief?: {
    generated_at?: string;
    content_en?: string;
    summary_en?: string;
  };
  daily_brief?: {
    generated_at?: string;
    content?: string;
    summary?: string;
  };
  latest_briefing?: {
    created_at?: string;
    generated_at?: string;
    body?: string;
    summary?: string;
  };
}

export interface DailyBriefView {
  generatedAt: string;
  summary: string;
  fullContent: string;
  isStale: boolean;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
const SUMMARY_MAX_WORDS = 60;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : null;

function pickGeneratedAt(raw: RawBriefShape | null): string | null {
  return (
    str(raw?.generated_at) ??
    str(raw?.brief?.generated_at) ??
    str(raw?.daily_brief?.generated_at) ??
    str(raw?.latest_briefing?.generated_at) ??
    str(raw?.latest_briefing?.created_at)
  );
}

function pickContent(raw: RawBriefShape | null): string | null {
  return (
    str(raw?.content_en) ??
    str(raw?.brief?.content_en) ??
    str(raw?.daily_brief?.content) ??
    str(raw?.latest_briefing?.body)
  );
}

function pickSummary(raw: RawBriefShape | null): string | null {
  return (
    str(raw?.summary_en) ??
    str(raw?.brief?.summary_en) ??
    str(raw?.daily_brief?.summary) ??
    str(raw?.latest_briefing?.summary)
  );
}

function truncateByWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "…";
}

export function shapeBrief(raw: RawBriefShape | null): DailyBriefView | null {
  const generatedAt = pickGeneratedAt(raw);
  const content = pickContent(raw);
  if (!generatedAt || !content) return null;

  const explicitSummary = pickSummary(raw);
  const summary = explicitSummary ?? truncateByWords(content, SUMMARY_MAX_WORDS);

  let isStale = false;
  try {
    isStale = Date.now() - new Date(generatedAt).getTime() > STALE_THRESHOLD_MS;
  } catch {
    isStale = false;
  }

  return {
    generatedAt,
    summary,
    fullContent: content,
    isStale,
  };
}
