"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERIFIED_MIN = exports.TIERS = exports.TIER_IDS = void 0;
exports.TIER_IDS = ["economy", "balanced", "max"];
/** Cost tiers: the same model with a different answer budget, not different models. */
exports.TIERS = {
    economy: { label: "Economy", maxTokens: 250, style: "Answer in at most four short sentences." },
    balanced: { label: "Balanced", maxTokens: 600, style: "Answer clearly in under 200 words, with the key steps." },
    max: { label: "Max", maxTokens: 1200, style: "Answer thoroughly: the reasoning, the caveats and the next steps." },
};
exports.VERIFIED_MIN = 70;
