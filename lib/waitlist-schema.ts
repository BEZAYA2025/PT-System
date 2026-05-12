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
    .email("Please enter a valid email address."),
  name: z.string().min(1, "Name is required.").max(120),
  experience: z.enum(tradingExperienceValues, {
    message: "Please pick an option.",
  }),
  markets: z
    .array(z.enum(marketValues))
    .min(1, "Pick at least one market."),
  challenge: z.string().max(2000).optional().or(z.literal("")),
  referral: z.string().max(280).optional().or(z.literal("")),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
