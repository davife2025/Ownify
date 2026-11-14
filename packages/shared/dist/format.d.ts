/** "buyer-3.swarm.testnet" -> "buyer-3" */
export declare const shortId: (id: string) => string;
/** Micro-USD to dollars: 2906664 -> "$2.91" */
export declare const usd: (micro: number, digits?: number) => string;
/** Small dollar amounts: 0.00071 -> "$0.0007"; under a hundredth of a cent -> "<$0.0001". */
export declare const usdFine: (dollars: number) => string;
