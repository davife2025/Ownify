/** "buyer-3.swarm.testnet" -> "buyer-3" */
export const shortId = (id: string): string => id.split(".")[0];

/** Micro-USD to dollars: 2906664 -> "$2.91" */
export const usd = (micro: number, digits = 2): string => `$${(micro / 1_000_000).toFixed(digits)}`;

/** Small dollar amounts: 0.00071 -> "$0.0007"; under a hundredth of a cent -> "<$0.0001". */
export const usdFine = (dollars: number): string =>
  dollars >= 0.01 ? `$${dollars.toFixed(2)}` : dollars >= 0.0001 ? `$${dollars.toFixed(4)}` : dollars === 0 ? "$0" : "<$0.0001";
