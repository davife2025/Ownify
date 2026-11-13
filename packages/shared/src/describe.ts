import { shortId, usd } from "./format";
import type { SwarmEvent } from "./swarm";

const s = (e: SwarmEvent, k: string) => String(e.data[k]);
const n = (e: SwarmEvent, k: string) => Number(e.data[k]);

const VOID_REASONS: Record<string, string> = {
  hash_mismatch: "it did not match its seal",
  no_reveal: "it was never revealed",
  out_of_range: "it was out of range",
  insufficient_balance: "not enough balance",
};
const FAIL_REASONS: Record<string, string> = {
  no_demand: "no demand",
  no_offers: "no offers",
  no_fit: "no seller could fit the pool",
};

/** One plain-English line per event, for the ticker and the event feed. */
export function describeEvent(e: SwarmEvent): string {
  switch (e.type) {
    case "roundOpened": return `Round ${e.round} opens for ${s(e, "gpuClass")} hours`;
    case "demandSubmitted": return `${shortId(s(e, "buyerId"))} asks for ${n(e, "hours")} GPU-hours`;
    case "demandVoided": return `${shortId(s(e, "buyerId"))} is out: ${VOID_REASONS[s(e, "reason")] ?? s(e, "reason")}`;
    case "poolLocked": return `Round ${e.round}: ${n(e, "buyers")} buyers pooled ${n(e, "totalHours")} GPU-hours`;
    case "bidCommitted": return `${shortId(s(e, "sellerId"))} sealed a bid`;
    case "revealOpened": return `Round ${e.round}: ${n(e, "commitments")} sealed bids are being revealed`;
    case "offerRevealed": return `${shortId(s(e, "sellerId"))} offers ${usd(n(e, "price"))}/h for up to ${n(e, "capacity")} h`;
    case "offerVoided": return `${shortId(s(e, "sellerId"))}'s offer is void: ${VOID_REASONS[s(e, "reason")] ?? s(e, "reason")}`;
    case "roundCleared": {
      const buyers = (e.data.allocations as unknown[]).length;
      return `Round ${e.round}: ${shortId(s(e, "winner"))} wins at ${usd(n(e, "price"))}/h, ${buyers} buyers pay their share`;
    }
    case "roundFailed": return `Round ${e.round}: no deal (${FAIL_REASONS[s(e, "reason")] ?? s(e, "reason")})`;
    case "settlementRecorded": return `${shortId(s(e, "from"))} pays ${usd(n(e, "amount"))} to ${shortId(s(e, "to"))}`;
    case "buyerDefaulted": return `${shortId(s(e, "buyerId"))} could not pay ${usd(n(e, "owed"))}`;
    case "roundClosed": return `Round ${e.round} closed`;
  }
}
