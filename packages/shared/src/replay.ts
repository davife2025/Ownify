import type { Allocation, Phase, Settlement, SwarmEvent } from "./swarm";

export interface RoundView {
  phase: Phase;
  demandsReceived: number;
  poolBuyers: number | null;
  poolHours: number | null;
  voidedDemands: { buyerId: string; reason: string }[];
  commitments: number;
  offers: { sellerId: string; price: number; capacity: number }[];
  voidedOffers: { sellerId: string; reason: string }[];
  cleared: { winner: string; price: number; totalHours: number; payout: number; allocations: Allocation[] } | null;
  failedReason: string | null;
  settlements: Settlement[];
  defaults: string[];
  closed: boolean;
}

/** Rebuilds what the live page may show from the public event stream alone (no hidden max prices). */
export function reduceRoundEvents(events: SwarmEvent[]): RoundView {
  const v: RoundView = {
    phase: "open", demandsReceived: 0, poolBuyers: null, poolHours: null, voidedDemands: [],
    commitments: 0, offers: [], voidedOffers: [], cleared: null, failedReason: null,
    settlements: [], defaults: [], closed: false,
  };
  for (const e of events) {
    const s = (k: string) => String(e.data[k]);
    const n = (k: string) => Number(e.data[k]);
    switch (e.type) {
      case "roundOpened": v.phase = "open"; break;
      case "demandSubmitted": v.phase = "demand"; v.demandsReceived++; break;
      case "demandVoided": v.voidedDemands.push({ buyerId: s("buyerId"), reason: s("reason") }); break;
      case "poolLocked": v.phase = "locked"; v.poolBuyers = n("buyers"); v.poolHours = n("totalHours"); break;
      case "bidCommitted": v.phase = "bid"; v.commitments++; break;
      case "revealOpened": v.phase = "reveal"; break;
      case "offerRevealed": v.offers.push({ sellerId: s("sellerId"), price: n("price"), capacity: n("capacity") }); break;
      case "offerVoided": v.voidedOffers.push({ sellerId: s("sellerId"), reason: s("reason") }); break;
      case "roundCleared":
        v.phase = "cleared";
        v.cleared = { winner: s("winner"), price: n("price"), totalHours: n("totalHours"), payout: n("payout"), allocations: e.data.allocations as Allocation[] };
        break;
      case "roundFailed": v.phase = "cleared"; v.failedReason = s("reason"); break;
      case "settlementRecorded": v.phase = "settled"; v.settlements.push({ from: s("from"), to: s("to"), amount: n("amount") }); break;
      case "buyerDefaulted": v.phase = "settled"; v.defaults.push(s("buyerId")); break;
      case "roundClosed": v.phase = "closed"; v.closed = true; break;
    }
  }
  return v;
}
