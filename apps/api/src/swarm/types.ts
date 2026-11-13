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
