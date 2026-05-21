"use client";

// Shared chat-bubble + day-separator render module, used by:
//
//   · components/dashboard/AvenChat.tsx — member-facing LIVE chat.
//     Imports `groupByDay` + `<DaySeparator>` only. Keeps its own
//     <ChatBubble> with live affordances (retry, sending, isGreeting,
//     source, framer-motion entry/exit). Day separators ride between
//     day-blocks as a pure additive visual. Hook/endpoints/SSE/voice
//     untouched — zero risk to the live send/receive flow.
//
//   · components/admin/MemberAvenTab.tsx — admin READ-ONLY transcript
//     of a member's full Aven history. Imports the default
//     `<ChatBubbleList>` component and hands it the hits[] returned
//     by /api/proxy/admin/aven/conversations/search?member_id=…
//     Defensive reads (content/role/timestamp) protect against the
//     undefined-from-backend render-crash class Paul caught earlier.

import { Fragment } from "react";
import { IconBrandTelegram, IconDeviceLaptop } from "@tabler/icons-react";

// Wide message shape that fits both:
//   · the member-Live ChatMessage (id, ts, content, role)
//   · the admin AvenSearchHit (variants like created_at / timestamp /
//     ts; content under content|message|text|snippet; role under
//     role|speaker|author)
// All fields optional so the upstream call site can pass either shape
// without a translation layer.
export interface ChatBubbleListMessage {
  id?: string | null;
  role?: string | null;
  speaker?: string | null;
  author?: string | null;
  content?: string | null;
  message?: string | null;
  text?: string | null;
  snippet?: string | null;
  ts?: string | null;
  timestamp?: string | null;
  created_at?: string | null;
  // Channel-of-origin signal: backend SSE emits `channel`, REST emits
  // `source`, others might surface `via` / `platform`. Normalised to
  // "telegram" | "web" by messageSource() — anything unrecognised
  // falls back to "web" so the icon stays meaningful.
  source?: string | null;
  channel?: string | null;
  via?: string | null;
  platform?: string | null;
}

// Helpers exported so the live-chat caller can reuse exactly the same
// timestamp + role + content resolution rules as the read-only caller.
export function messageTimestamp(m: ChatBubbleListMessage): string | null {
  return m.ts ?? m.timestamp ?? m.created_at ?? null;
}

export function messageContent(m: ChatBubbleListMessage): string {
  return m.content ?? m.message ?? m.text ?? m.snippet ?? "";
}

export function messageRole(m: ChatBubbleListMessage): string {
  return (m.role ?? m.speaker ?? m.author ?? "").toLowerCase();
}

export function isUserMessage(m: ChatBubbleListMessage): boolean {
  const r = messageRole(m);
  return r === "user" || r === "member";
}

export type MessageSource = "telegram" | "web";

export function messageSource(m: ChatBubbleListMessage): MessageSource {
  const raw = (
    m.source ??
    m.channel ??
    m.via ??
    m.platform ??
    ""
  ).toString().toLowerCase();
  return raw === "telegram" || raw === "tg" ? "telegram" : "web";
}

// WhatsApp-style day label. "Today" / "Yesterday" for the recent two
// days, then a localized date for everything older. The locale stays
// "en-US" to match the rest of the admin chrome; switching it to
// "de-DE" would render "Heute" / "Gestern" — keeping en for now
// because the dashboard headers + brief copy are all English.
export function formatDayLabel(dayIso: string): string {
  const todayIso = new Date().toISOString().slice(0, 10);
  if (dayIso === todayIso) return "Today";
  const yesterdayIso = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);
  if (dayIso === yesterdayIso) return "Yesterday";
  const dt = new Date(`${dayIso}T00:00:00Z`);
  if (!Number.isFinite(dt.getTime())) return dayIso;
  const sameYear = dt.getUTCFullYear() === new Date().getUTCFullYear();
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// Group messages by UTC calendar day, oldest day first, oldest msg
// within day first. Skips messages missing/invalid timestamps —
// upstream callers may want to render those separately (live-chat
// optimistic-sends with no `ts` yet) but for the day-separator pass
// it's safest to drop them than to put them under an arbitrary
// bucket. Live-chat keeps its own undated-render path; admin only
// renders backend-provided messages so this never bites it.
export function groupByDay<T extends ChatBubbleListMessage>(
  messages: readonly T[],
): Array<{ day: string; items: T[] }> {
  const buckets = new Map<string, T[]>();
  for (const m of messages) {
    const iso = messageTimestamp(m);
    if (!iso) continue;
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) continue;
    const day = new Date(t).toISOString().slice(0, 10);
    const arr = buckets.get(day) ?? [];
    arr.push(m);
    buckets.set(day, arr);
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1)) // ascending: oldest day at top
    .map(([day, items]) => ({
      day,
      items: items.slice().sort((a, b) => {
        const at = Date.parse(messageTimestamp(a) ?? "") || 0;
        const bt = Date.parse(messageTimestamp(b) ?? "") || 0;
        return at - bt;
      }),
    }));
}

// Visual divider rendered between day-blocks. Centered pill with a
// thin hairline on each side so the eye reads it as a date stamp,
// not a heading. Used by AvenChat for its live timeline AND by
// <ChatBubbleList> for the admin read-only view.
export function DaySeparator({ day }: { day: string }) {
  return (
    <div
      className="my-2 flex items-center gap-3 px-1 text-muted-foreground"
      aria-label={`Day ${day}`}
    >
      <span className="h-px flex-1 bg-border" aria-hidden />
      <span className="font-mono text-[10px] uppercase tracking-wider">
        {formatDayLabel(day)}
      </span>
      <span className="h-px flex-1 bg-border" aria-hidden />
    </div>
  );
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  try {
    return new Date(t).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Minimal read-only bubble. The admin transcript doesn't need any of
// the live affordances (retry / sending / isGreeting / source) so this
// stays a plain visual — same colour language as the live ChatBubble
// (emerald-tinted for the member, surface-elevated for Aven) so the
// member and admin views read as one product.
// Channel-of-origin pill. Renders for BOTH member-sent and Aven
// replies so the admin transcript shows whether the conversation
// happened in the dashboard chat or via the Telegram bridge.
export function SourceTag({ source }: { source: MessageSource }) {
  if (source === "telegram") {
    return (
      <span
        className="inline-flex items-center gap-1 text-emerald"
        title="Sent via Telegram"
      >
        <IconBrandTelegram size={11} stroke={1.75} aria-hidden />
        Telegram
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-muted-foreground/70"
      title="Sent via the web dashboard"
    >
      <IconDeviceLaptop size={11} stroke={1.75} aria-hidden />
      Web
    </span>
  );
}

function ReadOnlyBubble({
  message,
  userLabel,
  showSource,
}: {
  message: ChatBubbleListMessage;
  userLabel: string;
  showSource: boolean;
}) {
  const isUser = isUserMessage(message);
  const tone = isUser
    ? "rounded-tr-sm bg-emerald/[0.12] text-foreground"
    : "rounded-tl-sm bg-surface-elevated text-foreground";
  const ts = messageTimestamp(message);
  const body = messageContent(message);
  const source = messageSource(message);
  return (
    <div
      className={[
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
          tone,
        ].join(" ")}
      >
        <p className="whitespace-pre-line">{body}</p>
      </div>
      <div className="flex items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{isUser ? userLabel : "Aven"}</span>
        {ts && (
          <>
            <span aria-hidden>·</span>
            <span suppressHydrationWarning>{formatTime(ts)}</span>
          </>
        )}
        {showSource && (
          <>
            <span aria-hidden>·</span>
            <SourceTag source={source} />
          </>
        )}
      </div>
    </div>
  );
}

// Drop-in read-only chat renderer for admin contexts.
// Live-chat does NOT use this — it uses groupByDay + DaySeparator
// alongside its own animated ChatBubble.
export function ChatBubbleList({
  messages,
  userLabel = "Member",
  showSource = true,
}: {
  messages: readonly ChatBubbleListMessage[];
  /** Label rendered under the user-side bubble. Founder-sparring
   *  passes "Du" since Paul is the teacher, not a "Member". */
  userLabel?: string;
  /** Hide the Web/Telegram channel pill — sparring is web-only and
   *  the pill becomes meaningless noise. */
  showSource?: boolean;
}) {
  const days = groupByDay(messages);
  if (days.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
      {days.map(({ day, items }) => (
        <Fragment key={day}>
          <DaySeparator day={day} />
          {items.map((m, idx) => (
            <ReadOnlyBubble
              key={m.id ?? `${day}-${idx}`}
              message={m}
              userLabel={userLabel}
              showSource={showSource}
            />
          ))}
        </Fragment>
      ))}
    </div>
  );
}
