"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.costUsd = exports.ratesFor = exports.approxTokens = exports.DEFAULT_RATE_CARD = exports.COMPUTES = exports.COMPUTE_IDS = void 0;
exports.quote = quote;
const shelf_1 = require("./shelf");
exports.COMPUTE_IDS = ["fastest", "cheapest"];
/** Compute setting = which provider Hugging Face's router uses for the model. */
exports.COMPUTES = {
    fastest: { label: "Fastest provider", note: "Hugging Face's default: the provider with the highest throughput." },
    cheapest: { label: "Cheapest provider", note: "Hugging Face picks the provider with the lowest price per output token." },
};
/** Reference rates only. Not a quote: set the PRICE_* settings to your real rates. */
exports.DEFAULT_RATE_CARD = { fastest: { inputPerMTok: 1, outputPerMTok: 3 }, cheapest: null, source: "reference" };
const approxTokens = (text) => Math.ceil(text.length / 4);
exports.approxTokens = approxTokens;
const ratesFor = (card, compute) => compute === "cheapest" && card.cheapest ? card.cheapest : card.fastest;
exports.ratesFor = ratesFor;
const costUsd = (inputTokens, outputTokens, rates) => Math.round(((inputTokens * rates.inputPerMTok + outputTokens * rates.outputPerMTok) / 1_000_000) * 1e8) / 1e8;
exports.costUsd = costUsd;
/** Upper bound: the answer can use at most the tier's token budget. Input tokens are a rough estimate. */
function quote(a) {
    const inputTokens = a.systemTokens + (0, exports.approxTokens)(a.question);
    const maxOutputTokens = shelf_1.TIERS[a.tier].maxTokens;
    return {
        tier: a.tier,
        compute: a.compute,
        inputTokens,
        maxOutputTokens,
        maxCostUsd: (0, exports.costUsd)(inputTokens, maxOutputTokens, (0, exports.ratesFor)(a.card, a.compute)),
        cheaperRateKnown: a.compute !== "cheapest" || a.card.cheapest !== null,
    };
}
