import type { ReactNode } from "react";

export type ChatMessage = {
  role: "user" | "aven";
  content: ReactNode;
};

function Bubble({ role, children }: { role: "user" | "aven"; children: ReactNode }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[88%] flex-col gap-1.5 sm:max-w-[82%]">
        <span
          className={`flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
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
          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed sm:text-[15px] ${
            isUser
              ? "rounded-br-md border border-border bg-surface-elevated text-foreground"
              : "rounded-bl-md border border-emerald/20 bg-gradient-to-b from-emerald/[0.06] to-emerald/[0.015] text-foreground"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// Highlights numeric/data values inside Aven's responses (entry, ROI, scores,
// timeframe markers). Tinted emerald to draw the eye to the substance.
export function Mono({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.92em] font-medium text-emerald">
      {children}
    </span>
  );
}

export type AvenChatCardProps = {
  eyebrow: string;
  title: string;
  messages: ChatMessage[];
};

export function AvenChatCard({ eyebrow, title, messages }: AvenChatCardProps) {
  return (
    <article className="flex h-full flex-col gap-5 rounded-3xl border border-border bg-surface/40 p-5 transition-colors duration-300 hover:border-emerald/30 sm:p-7">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald">
          {eyebrow}
        </p>
        <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
          {title}
        </h3>
      </header>
      <div
        role="figure"
        aria-label={`Example: ${title}`}
        className="flex flex-1 flex-col gap-4"
      >
        {messages.map((m, i) => (
          <Bubble key={i} role={m.role}>
            {m.content}
          </Bubble>
        ))}
      </div>
    </article>
  );
}
