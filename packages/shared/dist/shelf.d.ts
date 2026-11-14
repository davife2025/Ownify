import type { ComputeId, RateCard, Rates } from "./pricing";
export declare const TIER_IDS: readonly ["economy", "balanced", "max"];
export type TierId = (typeof TIER_IDS)[number];
export interface TierDef {
    label: string;
    maxTokens: number;
    style: string;
}
/** Cost tiers: the same model with a different answer budget, not different models. */
export declare const TIERS: Record<TierId, TierDef>;
export declare const VERIFIED_MIN = 70;
export type AgentDomain = "housing" | "study" | "food";
export type LlmProvider = "huggingface" | "mock";
export interface TierScore {
    score: number;
    casesRun: number;
    safetyPassed: number;
    safetyTotal: number;
    unsafe: number;
    provider: LlmProvider;
    model: string;
    real: boolean;
    verified: boolean;
    seed: number;
    scoredAt: string;
    receipt: string;
}
export interface ShelfTier {
    tier: TierId;
    label: string;
    maxTokens: number;
    score: TierScore | null;
}
export interface ShelfAgent {
    id: AgentDomain;
    name: string;
    summary: string;
    safeBehavior: string;
    tiers: ShelfTier[];
}
export interface ShelfResponse {
    provider: LlmProvider;
    model: string;
    verifiedMin: number;
    agents: ShelfAgent[];
}
/** What one answer cost and what ran. It holds no question or answer text. */
export interface TaskReceipt {
    v: 1;
    id: string;
    at: string;
    agent: AgentDomain;
    tier: TierId;
    compute: ComputeId;
    provider: LlmProvider;
    real: boolean;
    modelRequested: string;
    modelServed: string;
    promptHash: string;
    questionHash: string;
    inputTokens: number;
    outputTokens: number;
    tokensSource: "reported" | "estimated";
    latencyMs: number;
    rates: Rates;
    rateSource: "reference" | "configured";
    costUsd: number;
    receiptHash: string;
}
export interface AskResponse {
    agent: AgentDomain;
    tier: TierId;
    compute: ComputeId;
    answer: string;
    provider: LlmProvider;
    model: string;
    real: boolean;
    promptHash: string;
    receipt: TaskReceipt;
}
export interface PricingResponse {
    rates: RateCard;
    /** Rough token count of each agent's system prompt per tier, for live price estimates. */
    systemTokens: Record<AgentDomain, Record<TierId, number>>;
    energy: {
        measured: false;
    };
}
