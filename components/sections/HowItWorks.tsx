import { Reveal } from "@/components/Reveal";

type Step = {
  number: string;
  name: string;
  title: string;
  body: string;
};

const steps: Step[] = [
  {
    number: "01",
    name: "Connect",
    title: "Bring your Binance.",
    body:
      "Read-only API key, 30 seconds to set up. PT System sees your positions, your fills, your PnL. It never trades for you.",
  },
  {
    number: "02",
    name: "Trade",
    title: "You trade. PT System listens.",
    body:
      "Every fill is tracked. Every position state — entry, mark, ROI, liquidation distance — synced in real time from Binance. No manual logging.",
  },
  {
    number: "03",
    name: "Spar",
    title: "Ask Aven anything.",
    body:
      "About your setup. Your open trade. The market context. Aven sees your numbers, applies Paul's method, answers in Paul's voice.",
  },
  {
    number: "04",
    name: "Learn",
    title: "Get better every day.",
    body:
      "Morning briefings with multi-TF state. Post-trade reviews with score lookback. Pattern feedback when discipline slips. Method, not luck.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            How PT System works.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:mt-20 md:grid-cols-2 md:gap-8 lg:grid-cols-4 lg:gap-10">
          {steps.map((step, idx) => (
            <Reveal key={step.number} delay={0.1 + idx * 0.1}>
              <article className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface/30 p-6 transition-colors hover:border-border/80 sm:p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Step {step.number}</span>
                  <span aria-hidden="true" className="mx-2 text-border">
                    /
                  </span>
                  <span>{step.name}</span>
                </p>
                <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-[1.7] text-muted-foreground">
                  {step.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
