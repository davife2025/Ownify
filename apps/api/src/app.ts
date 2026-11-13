import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";
import { APP_NAME, SIMULATION_SIZE, type HealthResponse } from "@ownify/shared";
import type { Provisioner } from "./agents/provisioner";
import type { AgentStore } from "./agents/store";
import { provisionSwarm } from "./agents/swarm";
import { buildBuyerPolicy, buildSellerPolicy } from "./agents/policy";
import { RunStore } from "./swarm/runs";
import { registerSwarmRoutes } from "./swarm/routes";

export interface AppDeps {
  provisioner: Provisioner;
  store: AgentStore;
  parent: string;
  supabaseConfigured: boolean;
  settlement: {
    assetId?: string;
    decimals: number;
    dailyUsd: string;
    payout?: { chain: string; address: string };
  };
  runs?: RunStore;
  logger?: boolean;
}

const provisionBody = z.object({
  buyers: z.number().int().min(1).max(50).default(SIMULATION_SIZE.buyers),
  sellers: z.number().int().min(1).max(50).default(SIMULATION_SIZE.sellers),
});

export async function buildApp(deps: AppDeps) {
  const app = Fastify({ logger: deps.logger ?? false });
  await app.register(cors, { origin: true });

  app.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    service: `${APP_NAME} api`,
    supabaseConfigured: deps.supabaseConfigured,
    time: new Date().toISOString(),
  }));

  app.post("/swarm/agents", async (req, reply) => {
    const parsed = provisionBody.safeParse(req.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "invalid body", issues: parsed.error.issues });
    const agents = await provisionSwarm(deps.provisioner, deps.store, parsed.data);
    return { mode: deps.provisioner.mode, parent: deps.parent, ...parsed.data, agents };
  });

  app.get("/swarm/agents", async () => ({
    mode: deps.provisioner.mode,
    parent: deps.parent,
    agents: await deps.store.list(),
  }));

  app.get<{ Params: { accountId: string } }>("/swarm/agents/:accountId/policy", async (req, reply) => {
    const agents = await deps.store.list();
    const agent = agents.find((a) => a.accountId === req.params.accountId);
    if (!agent) return reply.code(404).send({ error: "unknown agent" });

    const { assetId, decimals, dailyUsd, payout } = deps.settlement;
    if (!assetId) return reply.code(409).send({ error: "SETTLEMENT_ASSET_ID is not set" });
    const caps = { assetId, decimals, dailyUsd };

    let policy;
    if (agent.role === "buyer") {
      const sellerAddresses = agents.filter((a) => a.role === "seller").map((a) => a.accountId);
      if (sellerAddresses.length === 0) return reply.code(409).send({ error: "no sellers provisioned yet" });
      policy = buildBuyerPolicy({ ...caps, sellerAddresses });
    } else {
      if (!payout) return reply.code(409).send({ error: "SELLER_PAYOUT_CHAIN and SELLER_PAYOUT_ADDRESS are not set" });
      policy = buildSellerPolicy({ ...caps, payout });
    }
    return {
      preview: true,
      note: "Preview only. Seller addresses use the agents' account ids as stand-ins; real Intents addresses exist after agent creation. Nothing here has been signed or sent to the Agent API.",
      accountId: agent.accountId,
      policy,
    };
  });

  registerSwarmRoutes(app, { runs: deps.runs ?? new RunStore(), parent: deps.parent });

  return app;
}
