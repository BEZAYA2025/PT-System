"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

// One typed segment. `mono` flips the run into emerald monospace so trade
// numbers, scores, and tickers stand out from the prose.
type Token = { text: string; mono?: boolean };

type Message = {
  role: "user" | "aven";
  tokens: Token[];
};

type Scenario = {
  label: string;
  messages: Message[];
};

const scenarios: Scenario[] = [
  {
    label: "Morning briefing",
    messages: [
      {
        role: "aven",
        tokens: [
          { text: "Morning. BTC overnight: " },
          { text: "79,840 → 81,200", mono: true },
          { text: ". RSI " },
          { text: "64", mono: true },
          { text: " on " },
          { text: "4H", mono: true },
          { text: ". Liquidity: " },
          { text: "91%", mono: true },
          { text: " of shorts liquidated. Setup-scan: " },
          { text: "3", mono: true },
          { text: " confluence zones in next 4h." },
        ],
      },
    ],
  },
  {
    label: "Setup check",
    messages: [
      {
        role: "user",
        tokens: [{ text: "long at 80,200 — does the setup hold?" }],
      },
      {
        role: "aven",
        tokens: [
          { text: "Setup-Score " },
          { text: "8/10", mono: true },
          { text: ". Confluence: " },
          { text: "3", mono: true },
          { text: " sources. Counter: " },
          { text: "1H", mono: true },
          { text: " RSI " },
          { text: "71", mono: true },
          { text: " — wait for reset to " },
          { text: "9/10", mono: true },
          { text: "." },
        ],
      },
    ],
  },
  {
    label: "Mid-trade",
    messages: [
      {
        role: "user",
        tokens: [{ text: "should I trail my stop?" }],
      },
      {
        role: "aven",
        tokens: [
          { text: "Trade " },
          { text: "#3", mono: true },
          { text: " " },
          { text: "+6.2%", mono: true },
          { text: ". " },
          { text: "4H", mono: true },
          { text: " VMC " },
          { text: "w8", mono: true },
          { text: " still green. Liquidity above at " },
          { text: "$83k", mono: true },
          { text: " — strong magnet. Trail to entry, hold for " },
          { text: "$82.5k–83k", mono: true },
          { text: "." },
        ],
      },
    ],
  },
  {
    label: "Post-trade",
    messages: [
      {
        role: "aven",
        tokens: [
          { text: "Trade " },
          { text: "#3", mono: true },
          { text: " closed " },
          { text: "+4.0%", mono: true },
          { text: " Margin-ROI. Score " },
          { text: "8/10", mono: true },
          { text: " held up. SL trail was 1h late — could have captured " },
          { text: "+5.2%", mono: true },
          { text: "." },
        ],
      },
    ],
  },
];

const TYPE_MS = 22;
const HOLD_MS = 2400;
const FADE_MS = 280;
const TYPING_INDICATOR_MS = 600;
const REDUCED_HOLD_MS = 6000;

function totalChars(messages: Message[]): number {
  return messages.reduce(
    (sum, m) => sum + m.tokens.reduce((s, t) => s + t.text.length, 0),
    0,
  );
}

// Slice tokens up to `charLimit` characters (across the whole message list).
// Returns per-message token arrays so React can keep stable bubble keys.
function sliceMessages(
  messages: Message[],
  charLimit: number,
): { role: Message["role"]; tokens: Token[]; visible: boolean }[] {
  const out: { role: Message["role"]; tokens: Token[]; visible: boolean }[] = [];
  let remaining = charLimit;
  for (const m of messages) {
    const taken: Token[] = [];
    for (const t of m.tokens) {
      if (remaining <= 0) break;
      if (t.text.length <= remaining) {
        taken.push(t);
        remaining -= t.text.length;
      } else {
        taken.push({ ...t, text: t.text.slice(0, remaining) });
        remaining = 0;
      }
    }
    out.push({
      role: m.role,
      tokens: taken,
      visible: taken.length > 0 || charLimit === 0,
    });
    if (remaining <= 0) break;
  }
  return out;
}

function Bubble({
  role,
  tokens,
  showCaret,
}: {
  role: Message["role"];
  tokens: Token[];
  showCaret: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[88%] flex-col gap-1.5 sm:max-w-[80%]">
        <span
          className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.14em] ${
            isUser
              ? "self-end text-muted-foreground"
              : "self-start text-emerald"
          }`}
        >
          {!isUser && (
            <span
              aria-hidden="true"
              className="aven-pulse inline-block size-1.5 rounded-full bg-emerald shadow-[0_0_6px_rgba(16,185,129,0.55)]"
            />
          )}
          {isUser ? "You" : "Aven"}
        </span>
        <div
          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed sm:px-5 sm:py-4 sm:text-[15px] ${
            isUser
              ? "rounded-br-md border border-border bg-surface-elevated text-foreground"
              : "rounded-bl-md border border-emerald/20 bg-gradient-to-b from-emerald/[0.07] to-emerald/[0.015] text-foreground"
          }`}
        >
          {tokens.map((t, i) =>
            t.mono ? (
              <span
                key={i}
                className="font-mono text-[0.92em] font-medium text-emerald"
              >
                {t.text}
              </span>
            ) : (
              <span key={i}>{t.text}</span>
            ),
          )}
          {showCaret && (
            <span
              aria-hidden="true"
              className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[1px] bg-emerald align-middle"
              style={{ animation: "aven-caret 1s steps(2) infinite" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-1 text-emerald">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-1.5 rounded-full bg-emerald"
          style={{
            animation: "aven-dot 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
}

export function AvenLiveChat() {
  const reduce = useReducedMotion();
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState<"typing" | "hold" | "fade" | "indicator">(
    "typing",
  );
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scenario = scenarios[scenarioIdx];
  const total = totalChars(scenario.messages);

  // Drive the typing / hold / fade / indicator phases.
  useEffect(() => {
    if (paused) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (phase === "typing") {
      if (reduce) {
        // Reduced motion: skip per-char animation entirely. The render
        // path uses `displayChars` to show the full message immediately.
        // Schedule asynchronously to avoid mid-effect setState.
        timerRef.current = setTimeout(() => setPhase("hold"), 0);
        return;
      }
      if (chars < total) {
        timerRef.current = setTimeout(() => setChars((c) => c + 1), TYPE_MS);
        return;
      }
      // Fully typed → hold (scheduled async for the same reason).
      timerRef.current = setTimeout(() => setPhase("hold"), 0);
      return;
    }

    if (phase === "hold") {
      timerRef.current = setTimeout(
        () => setPhase("fade"),
        reduce ? REDUCED_HOLD_MS : HOLD_MS,
      );
      return;
    }

    if (phase === "fade") {
      timerRef.current = setTimeout(() => setPhase("indicator"), FADE_MS);
      return;
    }

    if (phase === "indicator") {
      timerRef.current = setTimeout(
        () => {
          setScenarioIdx((i) => (i + 1) % scenarios.length);
          setChars(0);
          setPhase("typing");
        },
        reduce ? 0 : TYPING_INDICATOR_MS,
      );
      return;
    }
  }, [chars, phase, paused, reduce, total]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Reduced-motion shows full content without the typing animation; the
  // typing phase is skipped at the state level so chars stays at 0, and
  // we derive the displayed count from the reduce flag instead.
  const displayChars = reduce ? total : chars;
  const visibleMessages = sliceMessages(scenario.messages, displayChars);
  const isTypingActive = !reduce && phase === "typing" && chars < total;
  const isFading = phase === "fade";
  const showIndicator = phase === "indicator";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-emerald/20 bg-surface p-6 shadow-[0_0_80px_-20px_rgba(16,185,129,0.25)] sm:p-8 lg:p-10"
    >
      <style>{`
        @keyframes aven-caret {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes aven-dot {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
        }
      `}</style>

      <div
        className={`flex min-h-[260px] flex-col gap-4 transition-opacity duration-300 sm:min-h-[280px] ${
          isFading ? "opacity-0" : "opacity-100"
        }`}
        aria-live="polite"
      >
        {showIndicator ? (
          <div className="flex flex-1 items-center">
            <TypingDots />
          </div>
        ) : (
          visibleMessages.map((m, i) => {
            // Show caret on the bubble that's currently being typed —
            // the last visible Aven bubble while typing is active.
            const isLast = i === visibleMessages.length - 1;
            const showCaret = isTypingActive && isLast && m.role === "aven";
            return (
              <Bubble
                key={`${scenarioIdx}-${i}`}
                role={m.role}
                tokens={m.tokens}
                showCaret={showCaret}
              />
            );
          })
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span className="font-mono">{scenario.label}</span>
        <span className="font-mono">
          {scenarioIdx + 1} / {scenarios.length}
        </span>
      </div>
    </div>
  );
}
