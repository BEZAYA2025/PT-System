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
  // Free-text content before the first recognised sub-label (often empty).
  preamble: string;
  // Sub-sections inside the setup block, parsed against SETUP_LABELS.
  items: BriefingItem[];
  // Raw body kept as a fallback for renderers when no sub-labels were
  // recognised (older / non-canonical briefings).
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

// Canonical sub-labels. Bilingual — briefings 1..1182 were authored in
// German, briefing 1183+ in English. We accept both label sets so the
// same parser works across the whole back catalogue. Restricting to a
// whitelist also prevents misreading a sentence like "Hinweis: ..."
// inside body prose as a new section.
const TF_LABELS = new Set([
  // German
  "Trendstruktur",
  "Bias",
  "Fibonacci",
  "Trendlinie/Ray",
  "EMA-Lage",
  "Divergenz",
  // English (Bias and Fibonacci are spelled the same in both)
  "Trend Structure",
  "Trendlines/Rays",
  "EMAs",
  "Divergence",
]);

// Sub-labels recognised inside the 🎯 setup section. Section title is
// "GESAMTBILD & SETUP" in DE briefings and "OVERALL PICTURE & SETUP" in
// EN briefings — the emoji-based detection picks up both without
// special-casing.
const SETUP_LABELS = new Set([
  // German
  "Übergeordneter Trend",
  "Wellenreiten aktiv",
  "Stärkstes Signal",
  // English
  "Higher Trend",
  "Active Wave",
  "Strongest Signal",
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
  // "bärisch" (with umlaut) is the more formal German spelling, "bearisch"
  // is the common anglicism — accept both, plus the English "bearish".
  if (/\b(bärisch|bearisch|bearish)\b/.test(lc)) return "bearish";
  return "neutral";
}

// Allow spaces inside the label token so multi-word labels like
// "Wellenreiten aktiv" or "Übergeordneter Trend" are matched. The caller
// passes the whitelist set that's valid for the current section.
function parseLabel(
  line: string,
  labels: Set<string>,
): { label: string; rest: string } | null {
  const trimmed = line.trim();
  const m = trimmed.match(
    /^([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß0-9 /.\-]{1,40}):\s*(.*)$/,
  );
  if (!m) return null;
  const label = m[1].trim();
  if (!labels.has(label)) return null;
  return { label, rest: m[2] };
}

export function parseBriefing(content: string): ParsedBriefing {
  const lines = content.split(/\r?\n/);

  let header: ParsedBriefing["header"] = null;
  const timeframes: BriefingTimeframe[] = [];
  let setup: BriefingSetup | null = null;

  let currentTf: BriefingTimeframe | null = null;
  let currentSetup:
    | {
        emoji: string;
        title: string;
        preambleLines: string[];
        items: BriefingItem[];
        bodyLines: string[];
      }
    | null = null;
  let currentItem: { label: string; bodyLines: string[] } | null = null;
  let currentSetupItem: { label: string; bodyLines: string[] } | null = null;

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
  const flushSetupItem = () => {
    if (currentSetupItem && currentSetup) {
      currentSetup.items.push({
        label: currentSetupItem.label,
        body: currentSetupItem.bodyLines.join("\n").trim(),
      });
    }
    currentSetupItem = null;
  };
  const flushSetup = () => {
    flushSetupItem();
    if (currentSetup) {
      setup = {
        emoji: currentSetup.emoji,
        title: currentSetup.title,
        preamble: currentSetup.preambleLines.join("\n").trim(),
        items: currentSetup.items,
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
        currentSetup = {
          emoji,
          title: titleRest,
          preambleLines: [],
          items: [],
          bodyLines: [],
        };
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
      const lbl = parseLabel(line, TF_LABELS);
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
      // Keep the raw line on bodyLines so renderers can fall back to the
      // unparsed body when no sub-labels matched.
      currentSetup.bodyLines.push(line);
      const lbl = parseLabel(line, SETUP_LABELS);
      if (lbl) {
        flushSetupItem();
        currentSetupItem = {
          label: lbl.label,
          bodyLines: lbl.rest ? [lbl.rest] : [],
        };
        continue;
      }
      if (currentSetupItem) {
        currentSetupItem.bodyLines.push(line.trim());
      } else {
        currentSetup.preambleLines.push(line);
      }
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
