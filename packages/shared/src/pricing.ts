import { TIERS, type TierId } from "./shelf";

export const COMPUTE_IDS = ["fastest", "cheapest"] as const;
export type ComputeId = (typeof COMPUTE_IDS)[number];

/** Compute setting = which provider Hugging Face's router uses for the model. */
export const COMPUTES: Record<ComputeId, { label: string; note: string }> = {
  fastest: { label: "Fastest provider", note: "Hugging Face's default: the provider with the highest throughput." },
  cheapest: { label: "Cheapest provider", note: "Hugging Face picks the provider with the lowest price per output token." },
};

/** USD per million tokens. */
export interface Rates { inputPerMTok: number; outputPerMTok: number }
export interface RateCard { fastest: Rates; cheapest: Rates | null; source: "reference" | "configured" }

/** Reference rates only. Not a quote: set the PRICE_* settings to your real rates. */
export const DEFAULT_RATE_CARD: RateCard = { fastest: { inputPerMTok: 1, outputPerMTok: 3 }, cheapest: null, source: "reference" };

export const approxTokens = (text: string): number => Math.ceil(text.length / 4);

export const ratesFor = (card: RateCard, compute: ComputeId): Rates =>
  compute === "cheapest" && card.cheapest ? card.cheapest : card.fastest;

export const costUsd = (inputTokens: number, outputTokens: number, rates: Rates): number =>
  Math.round(((inputTokens * rates.inputPerMTok + outputTokens * rates.outputPerMTok) / 1_000_000) * 1e8) / 1e8;

export interface Quote {
  tier: TierId;
  compute: ComputeId;
  inputTokens: number;
  maxOutputTokens: number;
  maxCostUsd: number;
  /** False when "cheapest" is chosen but no cheaper rates are configured, so the number uses the standard rates. */
  cheaperRateKnown: boolean;
}

/** Upper bound: the answer can use at most the tier's token budget. Input tokens are a rough estimate. */
export function quote(a: { systemTokens: number; question: string; tier: TierId; compute: ComputeId; card: RateCard }): Quote {
  const inputTokens = a.systemTokens + approxTokens(a.question);
  const maxOutputTokens = TIERS[a.tier].maxTokens;
  return {
    tier: a.tier,
    compute: a.compute,
    inputTokens,
    maxOutputTokens,
    maxCostUsd: costUsd(inputTokens, maxOutputTokens, ratesFor(a.card, a.compute)),
    cheaperRateKnown: a.compute !== "cheapest" || a.card.cheapest !== null,
  };
}
