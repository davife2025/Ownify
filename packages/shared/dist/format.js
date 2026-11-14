"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usdFine = exports.usd = exports.shortId = void 0;
/** "buyer-3.swarm.testnet" -> "buyer-3" */
const shortId = (id) => id.split(".")[0];
exports.shortId = shortId;
/** Micro-USD to dollars: 2906664 -> "$2.91" */
const usd = (micro, digits = 2) => `$${(micro / 1_000_000).toFixed(digits)}`;
exports.usd = usd;
/** Small dollar amounts: 0.00071 -> "$0.0007"; under a hundredth of a cent -> "<$0.0001". */
const usdFine = (dollars) => dollars >= 0.01 ? `$${dollars.toFixed(2)}` : dollars >= 0.0001 ? `$${dollars.toFixed(4)}` : dollars === 0 ? "$0" : "<$0.0001";
exports.usdFine = usdFine;
