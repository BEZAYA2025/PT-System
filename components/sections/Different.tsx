import { Reveal } from "@/components/Reveal";

type Row = {
  label: string;
  bots: string;
  copy: string;
  pt: string;
};

const rows: Row[] = [
  {
    label: "What you get",
    bots: "Auto trades",
    copy: "Mirror others",
    pt: "Method + Coach",
  },
  {
    label: "Why it works",
    bots: "Algorithm",
    copy: "Trust leader",
    pt: "Understanding",
  },
  {
    label: "What you learn",
    bots: "Nothing",
    copy: "Limited",
    pt: "Everything",
  },
  {
    label: "Available 24/7",
    bots: "Yes",
    copy: "N/A",
    pt: "Yes",
  },
  {
    label: "Transparent results",
    bots: "Backtested",
    copy: "Yes",
    pt: "Yes",
  },
  {
    label: "Personal",
    bots: "No",
    copy: "No",
    pt: "Yes",
  },
];

export function Different() {
  return (
    <section
      id="different"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Three categories. None of them fit.
          </h2>
        </Reveal>

        <Reveal delay={0.15}>
          {/* Desktop table */}
          <div className="mt-12 hidden overflow-hidden rounded-2xl border border-border md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-surface/40">
                  <th
                    scope="col"
                    className="px-6 py-5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  />
                  <th
                    scope="col"
                    className="px-6 py-5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    AI Bots
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Copy Trading
                  </th>
                  <th
                    scope="col"
                    className="bg-emerald/[0.06] px-6 py-5 text-xs font-medium uppercase tracking-[0.12em] text-emerald"
                  >
                    PT System
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i !== rows.length - 1 ? "border-b border-border" : ""}
                  >
                    <th
                      scope="row"
                      className="px-6 py-5 text-sm font-medium text-foreground"
                    >
                      {row.label}
                    </th>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {row.bots}
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {row.copy}
                    </td>
                    <td className="bg-emerald/[0.04] px-6 py-5 text-sm text-foreground">
                      {row.pt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="mt-10 space-y-4 md:hidden">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border bg-surface/30 p-5"
              >
                <p className="text-sm font-semibold text-foreground">
                  {row.label}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    AI Bots
                  </dt>
                  <dd className="text-muted-foreground">{row.bots}</dd>
                  <dt className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    Copy Trading
                  </dt>
                  <dd className="text-muted-foreground">{row.copy}</dd>
                  <dt className="text-xs uppercase tracking-[0.1em] text-emerald">
                    PT System
                  </dt>
                  <dd className="text-foreground">{row.pt}</dd>
                </dl>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
