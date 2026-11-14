"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeEvent = describeEvent;
const format_1 = require("./format");
const s = (e, k) => String(e.data[k]);
const n = (e, k) => Number(e.data[k]);
const VOID_REASONS = {
    hash_mismatch: "it did not match its seal",
    no_reveal: "it was never revealed",
    out_of_range: "it was out of range",
    insufficient_balance: "not enough balance",
};
const FAIL_REASONS = {
    no_demand: "no demand",
    no_offers: "no offers",
    no_fit: "no seller could fit the pool",
};
/** One plain-English line per event, for the ticker and the event feed. */
function describeEvent(e) {
    switch (e.type) {
        case "roundOpened": return `Round ${e.round} opens for ${s(e, "gpuClass")} hours`;
        case "demandSubmitted": return `${(0, format_1.shortId)(s(e, "buyerId"))} asks for ${n(e, "hours")} GPU-hours`;
        case "demandVoided": return `${(0, format_1.shortId)(s(e, "buyerId"))} is out: ${VOID_REASONS[s(e, "reason")] ?? s(e, "reason")}`;
        case "poolLocked": return `Round ${e.round}: ${n(e, "buyers")} buyers pooled ${n(e, "totalHours")} GPU-hours`;
        case "bidCommitted": return `${(0, format_1.shortId)(s(e, "sellerId"))} sealed a bid`;
        case "revealOpened": return `Round ${e.round}: ${n(e, "commitments")} sealed bids are being revealed`;
        case "offerRevealed": return `${(0, format_1.shortId)(s(e, "sellerId"))} offers ${(0, format_1.usd)(n(e, "price"))}/h for up to ${n(e, "capacity")} h`;
        case "offerVoided": return `${(0, format_1.shortId)(s(e, "sellerId"))}'s offer is void: ${VOID_REASONS[s(e, "reason")] ?? s(e, "reason")}`;
        case "roundCleared": {
            const buyers = e.data.allocations.length;
            return `Round ${e.round}: ${(0, format_1.shortId)(s(e, "winner"))} wins at ${(0, format_1.usd)(n(e, "price"))}/h, ${buyers} buyers pay their share`;
        }
        case "roundFailed": return `Round ${e.round}: no deal (${FAIL_REASONS[s(e, "reason")] ?? s(e, "reason")})`;
        case "settlementRecorded": return `${(0, format_1.shortId)(s(e, "from"))} pays ${(0, format_1.usd)(n(e, "amount"))} to ${(0, format_1.shortId)(s(e, "to"))}`;
        case "buyerDefaulted": return `${(0, format_1.shortId)(s(e, "buyerId"))} could not pay ${(0, format_1.usd)(n(e, "owed"))}`;
        case "roundClosed": return `Round ${e.round} closed`;
    }
}
