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
          className={`text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground ${
            isUser ? "self-end" : "self-start"
          }`}
        >
          {isUser ? "You" : "Aven"}
        </span>
        <div
          className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed sm:text-[15px] ${
            isUser
              ? "rounded-br-md bg-surface-elevated text-foreground"
              : "rounded-bl-md border border-border bg-surface text-foreground"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.92em] text-foreground">{children}</span>
  );
}

export type AvenChatCardProps = {
  eyebrow: string;
  title: string;
  messages: ChatMessage[];
};

export function AvenChatCard({ eyebrow, title, messages }: AvenChatCardProps) {
  return (
    <article className="flex h-full flex-col gap-5 rounded-3xl border border-border bg-surface/40 p-5 transition-colors hover:border-border/80 sm:p-7">
      <header className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
