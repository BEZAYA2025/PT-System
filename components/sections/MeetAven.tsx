import { Reveal } from "@/components/Reveal";
import {
  AvenChatCard,
  Mono,
  type AvenChatCardProps,
} from "@/components/AvenChatCard";

const cards: AvenChatCardProps[] = [
  {
    eyebrow: "Daily 7am",
    title: "Morning briefing",
    messages: [
      {
        role: "aven",
        content: (
          <>
            <p>
              Morning Paul. BTC overnight: <Mono>79,840 → 81,200</Mono>, sweep
              of weekly resistance.
            </p>
            <p className="mt-3">
              <Mono>4H</Mono> state: RSI <Mono>64</Mono>, MACD bull cross fresh,
              VMC <Mono>w7</Mono> — mid-phase, momentum holding.
            </p>
            <p className="mt-3">
              Liquidity: <Mono>91%</Mono> of 24h shorts liquidated. Squeeze
              done, funding flipped positive (<Mono>+0.018%</Mono>).
            </p>
            <p className="mt-3">
              Setup-Scan: 3 confluence zones in the next 4h window. GP at{" "}
              <Mono>78,400–79,100</Mono> is your strongest reversal candidate
              if we pull back.
            </p>
            <p className="mt-3 text-muted-foreground">
              Macro: no events until FOMC Wednesday.
            </p>
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "Before you open",
    title: "Pre-trade setup check",
    messages: [
      {
        role: "user",
        content: <>long at 80,200 — does the setup hold?</>,
      },
      {
        role: "aven",
        content: (
          <>
            <p>
              Setup-Score: <Mono>8/10</Mono>.
            </p>
            <p className="mt-3">
              Confluence: 3 sources. <Mono>4H</Mono> Fib 0.5 (
              <Mono>$80,180</Mono>) + Daily Trendline retest + EMA-50 cluster.
            </p>
            <p className="mt-3">
              Counter: <Mono>1H</Mono> RSI <Mono>71</Mono>, short-term
              overbought. Risk: 1–2 hour pullback before continuation.
            </p>
            <p className="mt-3 text-muted-foreground">
              What would make it 9/10: wait for 1H RSI &lt; 60 reset. What
              would break it: close below <Mono>$79,400</Mono> invalidates the
              Daily Trendline.
            </p>
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "While the trade runs",
    title: "Mid-trade question",
    messages: [
      {
        role: "user",
        content: <>mark hit 81,400, +6.2% on margin. hold or trail?</>,
      },
      {
        role: "aven",
        content: (
          <>
            <p>
              Trade <Mono>#3 long</Mono>, opened <Mono>$80,200</Mono>. Mark{" "}
              <Mono>$81,400</Mono>, ROI <Mono>+6.2%</Mono>.
            </p>
            <p className="mt-3">
              <Mono>4H</Mono> VMC <Mono>w8</Mono> — still green but late phase.
              Daily RSI <Mono>68</Mono>, approaching overbought zone.
            </p>
            <p className="mt-3">
              Liquidity above: <Mono>$96M</Mono> longs at <Mono>83,000</Mono> —
              strong magnet.
            </p>
            <p className="mt-3 text-muted-foreground">
              Recommendation: trail SL to entry. Keep position open for{" "}
              <Mono>$82,500–83,000</Mono> reach.
            </p>
          </>
        ),
      },
    ],
  },
  {
    eyebrow: "After the close",
    title: "Post-trade review",
    messages: [
      {
        role: "aven",
        content: (
          <>
            <p>
              Trade <Mono>#3</Mono> closed at <Mono>$82,045</Mono>. Realized{" "}
              <Mono>+4.0%</Mono> Margin-ROI in <Mono>7h 22m</Mono>.
            </p>
            <p className="mt-3">
              Score was <Mono>8/10</Mono> — that held up. Confluence executed
              as expected, reversal came at the resistance cluster.
            </p>
            <p className="mt-3">
              Lookback: SL trail was 1h late. Could have captured{" "}
              <Mono>+5.2%</Mono> instead of <Mono>+4.0%</Mono> with tighter
              management.
            </p>
            <p className="mt-3 text-muted-foreground">
              Pattern noted: bullish setups in late-phase Daily VMC work, but
              exit discipline matters more.
            </p>
          </>
        ),
      },
    ],
  },
];

export function MeetAven() {
  return (
    <section id="meet-aven" className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              An AI that knows your trades.
            </h2>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 space-y-6 text-base leading-[1.8] text-muted-foreground sm:text-lg">
              <p>
                Aven isn&apos;t a chatbot. He&apos;s a context-aware trading
                partner.
              </p>
              <p>
                When you open a position, Aven sees it. When you ask him{" "}
                <span className="italic text-foreground/90">
                  &ldquo;should I hold?&rdquo;
                </span>
                , he answers with real numbers — your entry, the current mark,
                the multi-timeframe indicators, the liquidity bias, your
                stop-loss distance. He responds in Paul&apos;s voice, with
                Paul&apos;s methodology, with Paul&apos;s discipline.
              </p>
              <p>
                He doesn&apos;t generate predictions. He helps you think
                clearer.
              </p>
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:mt-20 md:grid-cols-2 md:gap-6">
          {cards.map((card, idx) => (
            <Reveal key={card.title} delay={0.1 + idx * 0.08}>
              <AvenChatCard {...card} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
