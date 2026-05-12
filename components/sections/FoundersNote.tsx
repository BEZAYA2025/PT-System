import { Reveal } from "@/components/Reveal";

export function FoundersNote() {
  return (
    <section
      id="founders-note"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <blockquote className="space-y-6 font-sans text-lg italic leading-[1.85] text-foreground/90 sm:text-xl">
            <p>
              &ldquo;I&apos;m building PT System because the trading mentor I
              would have wanted years ago doesn&apos;t exist. Most courses teach
              in theory. Most signal groups teach nothing at all.
            </p>
            <p>
              I want members to actually understand markets — to think clearly
              about setups, to respect risk, to learn from both wins and
              losses. Aven is how I scale that, without diluting what makes
              the method work.
            </p>
            <p>
              If that sounds like what you&apos;re looking for, get on the
              list. We&apos;ll start small, with people who want to learn, not
              gamble.&rdquo;
            </p>
          </blockquote>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-10 font-mono text-sm tracking-wide text-muted-foreground">
            — Paul Theobald
          </p>
        </Reveal>
      </div>
    </section>
  );
}
