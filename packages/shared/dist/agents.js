"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIMULATION_SIZE = void 0;
exports.agentAccountId = agentAccountId;
exports.parseAgentAccountId = parseAgentAccountId;
exports.SIMULATION_SIZE = { buyers: 20, sellers: 5 };
function agentAccountId(parent, role, index) {
    if (!Number.isInteger(index) || index < 1)
        throw new Error("index must be a positive integer");
    return `${role}-${index}.${parent}`;
}
function parseAgentAccountId(accountId, parent) {
    const suffix = `.${parent}`;
    if (!accountId.endsWith(suffix))
        return null;
    const m = /^(buyer|seller)-([1-9][0-9]*)$/.exec(accountId.slice(0, -suffix.length));
    return m ? { role: m[1], index: Number(m[2]) } : null;
}
