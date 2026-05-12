import { Reveal } from "@/components/Reveal";
import { AvenLiveChat } from "@/components/AvenLiveChat";

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
          <p className="mt-8 max-w-2xl text-base leading-[1.8] text-muted-foreground sm:text-lg">
            Aven sees your positions in real time, applies the method&apos;s
            framework, and answers in conversation. Briefings, setup checks,
            mid-trade questions, post-trade reviews — one conversation, all
            day.
          </p>
        </Reveal>
      </div>

      <div className="mx-auto mt-14 max-w-3xl sm:mt-20">
        <Reveal delay={0.2}>
          <AvenLiveChat />
        </Reveal>
      </div>
    </section>
  );
}
