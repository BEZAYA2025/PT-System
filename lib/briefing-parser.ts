// Briefing-content parser.
//
// Briefings are plain text with a fixed structure (see AGENTS.md /
// pt_briefings table). This module turns the raw content into a typed
// tree the dashboard can render structurally instead of dumping a wall
// of text into the card.

export type BiasTone = "bullish" | "bearish" | "mixed" | "neutral";

export interface BriefingItem {
  label: string;
  body: string;
}

export interface BriefingTimeframe {
  emoji: string;
  name: string;
  items: BriefingItem[];
  bias: BiasTone;
  biasText: string | null;
}

export interface BriefingSetup {
  emoji: string;
  title: string;
  body: string;
}

export interface ParsedBriefing {
  header: {
    raw: string;
    asset: string | null;
    date: string | null;
    spot: string | null;
  } | null;
  timeframes: BriefingTimeframe[];
  setup: BriefingSetup | null;
  // First "Bias:" we can use for the card preview — Daily preferred, then
  // any other timeframe that has one.
  primaryBias: { tone: BiasTone; text: string; timeframe: string } | null;
}

const TIMEFRAME_EMOJIS: Record<string, string> = {
  "\u{1F4C5}": "DAILY", // 📅
  "\u{1F4CA}": "4H",    // 📊
  "⏰": "1H",       // ⏰
  "\u{1F550}": "30M",   // 🕐
  "⚡": "15M",      // ⚡
};
const SETUP_EMOJI = "\u{1F3AF}"; // 🎯
const HEADER_EMOJI = "\u{1F305}"; // 🌅

// Canonical sub-labels. Restricting to a whitelist prevents misreading a
// sentence like "Hinweis: ..." inside body prose as a new section.
const TF_LABELS = new Set([
  "Trendstruktur",
  "Bias",
  "Fibonacci",
  "Trendlinie/Ray",
  "EMA-Lage",
  "Divergenz",
]);

function isSeparator(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return /^[─━\s]+$/.test(t) && /[─━]/.test(t);
}

function detectSectionEmoji(line: string): string | null {
  const t = line.trimStart();
  for (const e of Object.keys(TIMEFRAME_EMOJIS)) {
    if (t.startsWith(e)) return e;
  }
  if (t.startsWith(SETUP_EMOJI)) return SETUP_EMOJI;
  return null;
}

function parseHeader(line: string): NonNullable<ParsedBriefing["header"]> {
  const raw = line.trim();
  const assetMatch = raw.match(/BRIEFING\s+([A-Z0-9]+)/i);
  const dateMatch =
    raw.match(/(\d{1,2}\.\d{1,2}\.\d{2,4})/) ??
    raw.match(/(\d{4}-\d{2}-\d{2})/);
  const spotMatch = raw.match(/Spot\s*\$?\s*([\d.,]+)/i);
  return {
    raw,
    asset: assetMatch?.[1]?.toUpperCase() ?? null,
    date: dateMatch?.[1] ?? null,
    spot: spotMatch?.[1] ?? null,
  };
}

function deriveBias(text: string): BiasTone {
  const lc = text.toLowerCase();
  if (/\b(gemischt|mixed)\b/.test(lc)) return "mixed";
  if (/\b(bullisch|bullish)\b/.test(lc)) return "bullish";
  if (/\b(bearisch|bearish)\b/.test(lc)) return "bearish";
  return "neutral";
}

function parseLabel(line: string): { label: string; rest: string } | null {
  const trimmed = line.trim();
  const m = trimmed.match(
    /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9/.\-]{1,40}):\s*(.*)$/,
  );
  if (!m) return null;
  if (!TF_LABELS.has(m[1])) return null;
  return { label: m[1], rest: m[2] };
}

export function parseBriefing(content: string): ParsedBriefing {
  const lines = content.split(/\r?\n/);

  let header: ParsedBriefing["header"] = null;
  const timeframes: BriefingTimeframe[] = [];
  let setup: BriefingSetup | null = null;

  let currentTf: BriefingTimeframe | null = null;
  let currentSetup:
    | { emoji: string; title: string; bodyLines: string[] }
    | null = null;
  let currentItem: { label: string; bodyLines: string[] } | null = null;

  const flushItem = () => {
    if (currentItem && currentTf) {
      currentTf.items.push({
        label: currentItem.label,
        body: currentItem.bodyLines.join("\n").trim(),
      });
    }
    currentItem = null;
  };
  const flushTf = () => {
    flushItem();
    if (currentTf) {
      const biasItem = currentTf.items.find(
        (i) => i.label.toLowerCase() === "bias",
      );
      if (biasItem) {
        currentTf.bias = deriveBias(biasItem.body);
        currentTf.biasText = biasItem.body;
      }
      timeframes.push(currentTf);
    }
    currentTf = null;
  };
  const flushSetup = () => {
    if (currentSetup) {
      setup = {
        emoji: currentSetup.emoji,
        title: currentSetup.title,
        body: currentSetup.bodyLines.join("\n").trim(),
      };
    }
    currentSetup = null;
  };

  for (const line of lines) {
    if (isSeparator(line)) continue;

    const trimmed = line.trim();

    if (!header && trimmed.startsWith(HEADER_EMOJI)) {
      header = parseHeader(line);
      continue;
    }

    const emoji = detectSectionEmoji(line);
    if (emoji) {
      flushTf();
      flushSetup();
      if (emoji === SETUP_EMOJI) {
        const titleRest = trimmed.slice(emoji.length).trim();
        currentSetup = { emoji, title: titleRest, bodyLines: [] };
      } else {
        currentTf = {
          emoji,
          name: TIMEFRAME_EMOJIS[emoji],
          items: [],
          bias: "neutral",
          biasText: null,
        };
      }
      continue;
    }

    if (currentTf) {
      const lbl = parseLabel(line);
      if (lbl) {
        flushItem();
        currentItem = {
          label: lbl.label,
          bodyLines: lbl.rest ? [lbl.rest] : [],
        };
        continue;
      }
      if (currentItem) {
        // Continuation of the current item — trim to drop any visual
        // indentation that came in from the source.
        currentItem.bodyLines.push(line.trim());
      }
      continue;
    }

    if (currentSetup) {
      currentSetup.bodyLines.push(line);
      continue;
    }
  }

  flushTf();
  flushSetup();

  let primaryBias: ParsedBriefing["primaryBias"] = null;
  const daily = timeframes.find((t) => t.name === "DAILY" && t.biasText);
  const fallback = timeframes.find((t) => t.biasText);
  const source = daily ?? fallback;
  if (source?.biasText) {
    primaryBias = {
      tone: source.bias,
      text: source.biasText,
      timeframe: source.name,
    };
  }

  return { header, timeframes, setup, primaryBias };
}
