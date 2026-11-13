import { createClient } from "@supabase/supabase-js";
import { env } from "./env";
import { buildApp } from "./app";
import { SimulatedProvisioner, TestnetProvisioner, type Provisioner } from "./agents/provisioner";
import { MemoryAgentStore, SupabaseAgentStore, type AgentStore } from "./agents/store";

function createProvisioner(): Provisioner {
  if (env.PROVISION_MODE === "testnet") {
    if (!env.NEAR_PARENT_PRIVATE_KEY) throw new Error("PROVISION_MODE=testnet needs NEAR_PARENT_PRIVATE_KEY");
    return new TestnetProvisioner({
      parent: env.NEAR_PARENT_ACCOUNT_ID,
      parentPrivateKey: env.NEAR_PARENT_PRIVATE_KEY,
      rpcUrl: env.NEAR_RPC_URL,
      fundingNear: env.AGENT_ACCOUNT_FUNDING_NEAR,
      keysDir: env.AGENT_KEYS_DIR,
    });
  }
  return new SimulatedProvisioner(env.NEAR_PARENT_ACCOUNT_ID);
}

function createStore(): { store: AgentStore; supabaseConfigured: boolean } {
  if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      store: new SupabaseAgentStore(createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)),
      supabaseConfigured: true,
    };
  }
  return { store: new MemoryAgentStore(), supabaseConfigured: false };
}

async function main() {
  const { store, supabaseConfigured } = createStore();
  const app = await buildApp({
    provisioner: createProvisioner(),
    store,
    parent: env.NEAR_PARENT_ACCOUNT_ID,
    supabaseConfigured,
    settlement: {
      assetId: env.SETTLEMENT_ASSET_ID,
      decimals: env.SETTLEMENT_ASSET_DECIMALS,
      dailyUsd: env.AGENT_DAILY_USD_BUDGET,
      payout:
        env.SELLER_PAYOUT_CHAIN && env.SELLER_PAYOUT_ADDRESS
          ? { chain: env.SELLER_PAYOUT_CHAIN, address: env.SELLER_PAYOUT_ADDRESS }
          : undefined,
    },
    logger: true,
  });
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
