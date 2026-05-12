import type { ReactNode } from "react";

function Bubble({
  role,
  children,
}: {
  role: "user" | "aven";
  children: ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex max-w-[88%] flex-col gap-1.5 sm:max-w-[78%]">
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground ${
            isUser ? "self-end" : "self-start"
          }`}
        >
          {isUser ? "You" : "Aven"}
        </span>
        <div
          className={`rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:px-5 sm:py-4 ${
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

function Mono({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[0.92em] text-foreground">{children}</span>
  );
}

export function AvenChatMock() {
  return (
    <div
      role="figure"
      aria-label="Example conversation with Aven"
      className="rounded-3xl border border-border bg-surface/40 p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-8"
    >
      <div className="flex flex-col gap-5">
        <Bubble role="user">how does my trade look right now?</Bubble>

        <Bubble role="aven">
          <p>
            Trade <Mono>#2 SHORT BTCUSDT 20×</Mono>, ROI{" "}
            <Mono>+9.6%</Mono>. <Mono>4H VMC w7</Mono> — late phase, watch for
            reversal.
          </p>
          <p className="mt-3">
            Liquidity 24h: <Mono>$87M</Mono> shorts liquidated (
            <Mono>91%</Mono> short-share). Squeeze fuel diminishing.
          </p>
          <p className="mt-3">
            Stop at <Mono>$81,770</Mono> is <Mono>1.2%</Mono> from mark, tight
            on weekend.
          </p>
          <p className="mt-3 text-muted-foreground">
            Recommendation: hold but tighten SL toward breakeven.
          </p>
        </Bubble>
      </div>
    </div>
  );
}
