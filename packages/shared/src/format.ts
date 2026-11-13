/** "buyer-3.swarm.testnet" -> "buyer-3" */
export const shortId = (id: string): string => id.split(".")[0];

/** Micro-USD to dollars: 2906664 -> "$2.91" */
export const usd = (micro: number, digits = 2): string => `$${(micro / 1_000_000).toFixed(digits)}`;
