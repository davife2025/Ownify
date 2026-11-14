export type AgentRole = "buyer" | "seller";
export type ProvisionMode = "simulated" | "testnet";
export interface AgentRecord {
    accountId: string;
    role: AgentRole;
    index: number;
    mode: ProvisionMode;
    publicKey: string | null;
    createdAt: string;
}
export declare const SIMULATION_SIZE: {
    readonly buyers: 20;
    readonly sellers: 5;
};
export declare function agentAccountId(parent: string, role: AgentRole, index: number): string;
export declare function parseAgentAccountId(accountId: string, parent: string): {
    role: AgentRole;
    index: number;
} | null;
