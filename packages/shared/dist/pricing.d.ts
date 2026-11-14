import { type TierId } from "./shelf";
export declare const COMPUTE_IDS: readonly ["fastest", "cheapest"];
export type ComputeId = (typeof COMPUTE_IDS)[number];
/** Compute setting = which provider Hugging Face's router uses for the model. */
export declare const COMPUTES: Record<ComputeId, {
    label: string;
    note: string;
}>;
/** USD per million tokens. */
export interface Rates {
    inputPerMTok: number;
    outputPerMTok: number;
}
export interface RateCard {
    fastest: Rates;
    cheapest: Rates | null;
    source: "reference" | "configured";
}
/** Reference rates only. Not a quote: set the PRICE_* settings to your real rates. */
export declare const DEFAULT_RATE_CARD: RateCard;
export declare const approxTokens: (text: string) => number;
export declare const ratesFor: (card: RateCard, compute: ComputeId) => Rates;
export declare const costUsd: (inputTokens: number, outputTokens: number, rates: Rates) => number;
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
export declare function quote(a: {
    systemTokens: number;
    question: string;
    tier: TierId;
    compute: ComputeId;
    card: RateCard;
}): Quote;
