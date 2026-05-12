"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CircleCheck,
  CircleMinus,
  CircleX,
  type LucideIcon,
} from "lucide-react";

type Tone = "positive" | "neutral" | "negative";

type Cell = {
  text: string;
  tone: Tone;
};

type Column = {
  key: "bots" | "copy" | "pt";
  category: string;
  sub: string;
  cells: Cell[];
};

type RowSpec = {
  label: string;
  bots: Cell;
  copy: Cell;
  pt: Cell;
};

const rowSpecs: RowSpec[] = [
  {
    label: "What you get",
    bots: { text: "Auto trades", tone: "neutral" },
    copy: { text: "Mirror others", tone: "neutral" },
    pt: { text: "Method + Coach", tone: "positive" },
  },
  {
    label: "Why it works",
    bots: { text: "Algorithm", tone: "neutral" },
    copy: { text: "Trust leader", tone: "neutral" },
    pt: { text: "Understanding", tone: "positive" },
  },
  {
    label: "What you learn",
    bots: { text: "Nothing", tone: "negative" },
    copy: { text: "Limited", tone: "neutral" },
    pt: { text: "Everything", tone: "positive" },
  },
  {
    label: "Available 24/7",
    bots: { text: "Yes", tone: "neutral" },
    copy: { text: "N/A", tone: "neutral" },
    pt: { text: "Yes", tone: "positive" },
  },
  {
    label: "Transparent results",
    bots: { text: "Backtested", tone: "neutral" },
    copy: { text: "Yes", tone: "neutral" },
    pt: { text: "Yes", tone: "positive" },
  },
  {
    label: "Personal",
    bots: { text: "No", tone: "negative" },
    copy: { text: "No", tone: "negative" },
    pt: { text: "Yes", tone: "positive" },
  },
];

const columns: Column[] = [
  {
    key: "bots",
    category: "AI Bots",
    sub: "Automated",
    cells: rowSpecs.map((r) => r.bots),
  },
  {
    key: "copy",
    category: "Copy Trading",
    sub: "Mirror",
    cells: rowSpecs.map((r) => r.copy),
  },
  {
    key: "pt",
    category: "PT System",
    sub: "Mentored",
    cells: rowSpecs.map((r) => r.pt),
  },
];

function StatusIcon({ tone, isPt }: { tone: Tone; isPt: boolean }) {
  const props = { strokeWidth: 1.6, "aria-hidden": true } as const;
  const Icon: LucideIcon =
    tone === "positive"
      ? CircleCheck
      : tone === "negative"
        ? CircleX
        : CircleMinus;
  const color =
    tone === "positive" && isPt
      ? "text-emerald"
      : tone === "negative"
        ? "text-red-400/70"
        : "text-muted-foreground/60";
  return <Icon {...props} className={`size-4 ${color}`} />;
}

function cellTextClass(tone: Tone, isPt: boolean): string {
  if (isPt && tone === "positive") return "text-foreground font-medium";
  if (tone === "negative") return "text-muted-foreground/70";
  return "text-muted-foreground";
}

type Tilt = "left" | "center" | "right";

type CardProps = {
  column: Column;
  isPt: boolean;
  tilt: Tilt;
};

// Tailwind needs the class names to appear literally in the source for the
// JIT to pick them up — string-templating breaks that.
const tiltClass: Record<Tilt, string> = {
  left: "md:-rotate-2",
  center: "md:rotate-0",
  right: "md:rotate-2",
};

function ComparisonCard({ column, isPt, tilt }: CardProps) {
  const reduce = useReducedMotion();

  const containerClass = isPt
    ? "relative rounded-2xl border border-emerald/40 bg-gradient-to-b from-surface to-emerald/[0.05] p-7 shadow-[0_0_60px_-10px_rgba(16,185,129,0.18)] transition-all duration-300 hover:shadow-[0_0_80px_-5px_rgba(16,185,129,0.28)] sm:p-8"
    : "relative rounded-2xl border border-border bg-surface p-7 opacity-80 transition-opacity duration-300 hover:opacity-95 sm:p-8";

  const initial = reduce
    ? { opacity: 1, y: 0, rotate: 0 }
    : isPt
      ? { opacity: 0, y: 16, rotate: 0 }
      : { opacity: 0, y: 16 };

  const whileInView = isPt
    ? { opacity: 1, y: -12, rotate: 0, scale: 1.04 }
    : { opacity: 0.8, y: 0 };

  return (
    <motion.div
      initial={initial}
      whileInView={whileInView}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.6,
        delay: isPt ? 0.15 : 0,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={tiltClass[tilt]}
    >
      <article className={containerClass}>
        <header className="flex flex-col gap-1">
          <p
            className={`text-xs font-mono uppercase tracking-[0.18em] ${
              isPt ? "text-emerald" : "text-muted-foreground"
            }`}
          >
            {column.sub}
          </p>
          <h3
            className={`text-xl font-semibold tracking-tight ${
              isPt ? "text-foreground" : "text-muted-foreground"
            } sm:text-2xl`}
          >
            {column.category}
          </h3>
        </header>

        <dl className="mt-6 divide-y divide-border">
          {column.cells.map((cell, i) => (
            <div
              key={rowSpecs[i].label}
              className="flex items-center justify-between gap-3 py-3.5"
            >
              <dt className="text-[12px] uppercase tracking-[0.1em] text-muted-foreground">
                {rowSpecs[i].label}
              </dt>
              <dd className="flex items-center gap-2">
                <StatusIcon tone={cell.tone} isPt={isPt} />
                <span
                  className={`text-sm ${cellTextClass(cell.tone, isPt)}`}
                >
                  {cell.text}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </article>
    </motion.div>
  );
}

const tilts: Tilt[] = ["left", "center", "right"];

export function Different() {
  return (
    <section
      id="different"
      className="scroll-mt-16 px-6 py-24 sm:py-32 lg:py-40"
    >
      <div className="mx-auto max-w-6xl">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl"
        >
          Three categories. None of them fit.
        </motion.h2>

        <div className="mt-14 grid gap-6 sm:mt-20 md:grid-cols-3 md:items-center md:gap-7 lg:gap-9">
          {columns.map((col, idx) => (
            <ComparisonCard
              key={col.key}
              column={col}
              isPt={col.key === "pt"}
              tilt={tilts[idx]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
