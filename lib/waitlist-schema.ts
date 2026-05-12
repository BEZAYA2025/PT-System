import { z } from "zod";

export const tradingExperienceOptions = [
  { value: "starting", label: "Just starting" },
  { value: "1-2", label: "1–2 years" },
  { value: "3-5", label: "3–5 years" },
  { value: "5+", label: "5+ years" },
] as const;

export const marketOptions = [
  { value: "btc-eth-futures", label: "BTC/ETH Futures" },
  { value: "spot-crypto", label: "Spot Crypto" },
  { value: "stocks-etfs", label: "Stocks/ETFs" },
  { value: "forex", label: "Forex" },
  { value: "other", label: "Other" },
] as const;

const tradingExperienceValues = tradingExperienceOptions.map((o) => o.value) as [
  (typeof tradingExperienceOptions)[number]["value"],
  ...(typeof tradingExperienceOptions)[number]["value"][],
];

const marketValues = marketOptions.map((o) => o.value) as [
  (typeof marketOptions)[number]["value"],
  ...(typeof marketOptions)[number]["value"][],
];

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address.")
    .max(255),
  name: z.string().min(2, "Name is required.").max(120),
  experience: z.enum(tradingExperienceValues, {
    message: "Please pick an option.",
  }),
  markets: z
    .array(z.enum(marketValues))
    .min(1, "Pick at least one market."),
  challenge: z.string().max(1000).optional().or(z.literal("")),
  source: z.string().max(500).optional().or(z.literal("")),
  // Honeypot — bots fill it; real users never see it. The route handler
  // checks for a non-empty value and silently accepts the request without
  // persisting anything. Keep this permissive in zod so bots get a 200.
  website: z.string().max(500).optional().or(z.literal("")),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export function experienceLabel(value: string): string {
  return (
    tradingExperienceOptions.find((o) => o.value === value)?.label ?? value
  );
}

export function marketLabels(values: string[]): string[] {
  return values.map(
    (v) => marketOptions.find((o) => o.value === v)?.label ?? v,
  );
}
