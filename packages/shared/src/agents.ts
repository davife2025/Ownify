export type AgentRole = "buyer" | "seller";
export type ProvisionMode = "simulated" | "testnet";

export interface AgentRecord {
  accountId: string; // e.g. buyer-1.<parent>
  role: AgentRole;
  index: number;
  mode: ProvisionMode;
  publicKey: string | null;
  createdAt: string;
}

export const SIMULATION_SIZE = { buyers: 20, sellers: 5 } as const;

export function agentAccountId(parent: string, role: AgentRole, index: number): string {
  if (!Number.isInteger(index) || index < 1) throw new Error("index must be a positive integer");
  return `${role}-${index}.${parent}`;
}

export function parseAgentAccountId(
  accountId: string,
  parent: string,
): { role: AgentRole; index: number } | null {
  const suffix = `.${parent}`;
  if (!accountId.endsWith(suffix)) return null;
  const m = /^(buyer|seller)-([1-9][0-9]*)$/.exec(accountId.slice(0, -suffix.length));
  return m ? { role: m[1] as AgentRole, index: Number(m[2]) } : null;
}
