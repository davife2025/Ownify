import type { Allocation, Phase, Settlement, SwarmEvent } from "./swarm";
export interface RoundView {
    phase: Phase;
    demandsReceived: number;
    poolBuyers: number | null;
    poolHours: number | null;
    voidedDemands: {
        buyerId: string;
        reason: string;
    }[];
    commitments: number;
    offers: {
        sellerId: string;
        price: number;
        capacity: number;
    }[];
    voidedOffers: {
        sellerId: string;
        reason: string;
    }[];
    cleared: {
        winner: string;
        price: number;
        totalHours: number;
        payout: number;
        allocations: Allocation[];
    } | null;
    failedReason: string | null;
    settlements: Settlement[];
    defaults: string[];
    closed: boolean;
}
/** Rebuilds what the live page may show from the public event stream alone (no hidden max prices). */
export declare function reduceRoundEvents(events: SwarmEvent[]): RoundView;
