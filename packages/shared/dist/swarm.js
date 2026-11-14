"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASES = exports.DEFAULT_PARAMS = void 0;
exports.DEFAULT_PARAMS = {
    gpuClass: "generic-gpu",
    minHours: 1,
    maxHours: 100,
    minPrice: 100_000,
    maxPrice: 20_000_000,
};
exports.PHASES = ["open", "demand", "locked", "bid", "reveal", "cleared", "settled", "closed"];
