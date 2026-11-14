// Agent shelf types shared by the API and the web app.
import type { ComputeId, RateCard, Rates } from "./pricing";

export const TIER_IDS = ["economy", "balanced", "max"] as const;
export type TierId = (typeof TIER_IDS)[number];

export interface TierDef { label: string; maxTokens: number; style: string }

/** Cost tiers: the same model with a different answer budget, not different models. */
export const TIERS: Record<TierId, TierDef> = {
  economy: { label: "Economy", maxTokens: 250, style: "Answer in at most four short sentences." },
  balanced: { label: "Balanced", maxTokens: 600, style: "Answer clearly in under 200 words, with the key steps." },
  max: { label: "Max", maxTokens: 1200, style: "Answer thoroughly: the reasoning, the caveats and the next steps." },
};

export const VERIFIED_MIN = 70;

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

export interface ShelfTier { tier: TierId; label: string; maxTokens: number; score: TierScore | null }

export interface ShelfAgent {
  id: AgentDomain;
  name: string;
  summary: string;
  safeBehavior: string;
  tiers: ShelfTier[];
}

export interface ShelfResponse { provider: LlmProvider; model: string; verifiedMin: number; agents: ShelfAgent[] }

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
  energy: { measured: false };
}
