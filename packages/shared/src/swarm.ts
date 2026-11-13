// Wire types for the swarm coordinator, shared by the API and the web app.
// Prices are integers in micro-USD per GPU-hour; hours are integer GPU-hours. See RULES.md.
export interface RoundParams {
  gpuClass: string;
  minHours: number;
  maxHours: number;
  minPrice: number;
  maxPrice: number;
}

export const DEFAULT_PARAMS: RoundParams = {
  gpuClass: "generic-gpu",
  minHours: 1,
  maxHours: 100,
  minPrice: 100_000,
  maxPrice: 20_000_000,
};

export interface Demand { buyerId: string; hours: number; maxPrice: number; seq: number }
export interface Offer { sellerId: string; price: number; capacity: number; commitSeq: number }
export interface Allocation { buyerId: string; hours: number; pays: number }
export interface Removal { buyerId: string; reason: "capacity" | "below_price" }

export interface TraceStep {
  poolSize: number;
  poolHours: number;
  eligible: string[];
  winner?: string;
  price?: number;
  removed?: string;
  why?: "capacity" | "below_price";
}

export type ClearResult =
  | { status: "failed"; reason: "no_demand" | "no_offers" | "no_fit"; removed: Removal[]; trace: TraceStep[] }
  | {
      status: "cleared";
      winner: string;
      price: number;
      totalHours: number;
      payout: number;
      allocations: Allocation[];
      removed: Removal[];
      trace: TraceStep[];
    };

export type EventType =
  | "roundOpened" | "demandSubmitted" | "demandVoided" | "poolLocked"
  | "bidCommitted" | "revealOpened" | "offerRevealed" | "offerVoided"
  | "roundCleared" | "roundFailed" | "settlementRecorded" | "buyerDefaulted" | "roundClosed";

export interface SwarmEvent { seq: number; round: number; type: EventType; data: Record<string, unknown> }
export type Emit = (type: EventType, data: Record<string, unknown>) => void;

export const PHASES = ["open", "demand", "locked", "bid", "reveal", "cleared", "settled", "closed"] as const;
export type Phase = (typeof PHASES)[number];

export interface Settlement { from: string; to: string; amount: number }

export interface RoundRecord {
  id: string;
  index: number;
  params: RoundParams;
  phase: Phase;
  demands: Demand[];
  voidedDemands: { buyerId: string; reason: string }[];
  offers: Offer[];
  voidedOffers: { sellerId: string; reason: string }[];
  result: ClearResult | null;
  settlements: Settlement[];
  defaults: string[];
}

export interface SimConfig { seed: number; rounds: number; buyers: number; sellers: number; parent: string }

export interface RoundSummary {
  round: number;
  status: "cleared" | "failed";
  winner?: string;
  price?: number;
  buyers?: number;
  poolHours?: number;
  payout?: number;
  reason?: string;
  voidedDemands: number;
  voidedOffers: number;
  defaults: number;
}

export interface RunSummary { runId: string; createdAt: string; seed: number; rounds: number; summary: RoundSummary[] }

export interface RunDetail {
  id: string;
  createdAt: string;
  seed: number;
  config: SimConfig;
  params: RoundParams;
  rounds: RoundRecord[];
  summary: RoundSummary[];
  initialBalances: Record<string, number>;
  finalBalances: Record<string, number>;
  eventCount: number;
}
