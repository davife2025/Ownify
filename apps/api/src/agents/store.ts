import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentRecord } from "@ownify/shared";

export interface AgentStore {
  upsert(agent: AgentRecord): Promise<void>;
  list(): Promise<AgentRecord[]>;
}

export class MemoryAgentStore implements AgentStore {
  private agents = new Map<string, AgentRecord>();
  async upsert(agent: AgentRecord) {
    this.agents.set(agent.accountId, agent);
  }
  async list() {
    return [...this.agents.values()].sort((a, b) =>
      a.role === b.role ? a.index - b.index : a.role === "buyer" ? -1 : 1,
    );
  }
}

// Table: supabase/migrations/0001_agents.sql. Not run against a real project yet.
export class SupabaseAgentStore implements AgentStore {
  constructor(private db: SupabaseClient) {}

  async upsert(a: AgentRecord) {
    const { error } = await this.db.from("agents").upsert(
      {
        account_id: a.accountId,
        role: a.role,
        idx: a.index,
        mode: a.mode,
        public_key: a.publicKey,
        created_at: a.createdAt,
      },
      { onConflict: "account_id" },
    );
    if (error) throw new Error(`agents upsert failed: ${error.message}`);
  }

  async list(): Promise<AgentRecord[]> {
    const { data, error } = await this.db.from("agents").select("*").order("role").order("idx");
    if (error) throw new Error(`agents list failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      accountId: r.account_id,
      role: r.role,
      index: r.idx,
      mode: r.mode,
      publicKey: r.public_key,
      createdAt: r.created_at,
    }));
  }
}
