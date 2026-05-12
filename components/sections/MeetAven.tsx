import { Reveal } from "@/components/Reveal";
import { AvenChatMock } from "@/components/AvenChatMock";

export function MeetAven() {
  return (
    <section id="meet-aven" className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40">
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
              He doesn&apos;t generate predictions. He helps you think clearer.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-12 sm:mt-16">
            <AvenChatMock />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
