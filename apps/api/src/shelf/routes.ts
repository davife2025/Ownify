import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { TIERS, TIER_IDS, VERIFIED_MIN, type AgentDomain, type AskResponse, type ShelfResponse, type TierId } from "@ownify/shared";
import { AGENTS, AGENT_IDS, promptHashOf, systemFor } from "./agents";
import { LlmError, type LlmClient } from "./llm";
import { makeLimiter } from "./limiter";
import { receiptOf } from "./receipt";
import type { ScoreStore } from "./store";

export interface ShelfDeps { llm: LlmClient; scores: ScoreStore; askLimitPerHour: number }

const askBody = z.object({
  question: z.string().trim().min(3).max(800),
  tier: z.enum(TIER_IDS).default("balanced"),
});

export function registerShelfRoutes(app: FastifyInstance, deps: ShelfDeps) {
  const allowAsk = makeLimiter(deps.askLimitPerHour, 3_600_000);

  app.get("/shelf", async (): Promise<ShelfResponse> => ({
    provider: deps.llm.provider,
    model: deps.llm.model,
    verifiedMin: VERIFIED_MIN,
    agents: AGENT_IDS.map((id) => ({
      id,
      name: AGENTS[id].name,
      summary: AGENTS[id].summary,
      safeBehavior: AGENTS[id].safeBehavior,
      tiers: TIER_IDS.map((tier) => ({
        tier,
        label: TIERS[tier].label,
        maxTokens: TIERS[tier].maxTokens,
        score: deps.scores.get(id, tier)?.score ?? null,
      })),
    })),
  }));

  app.post<{ Params: { agentId: string } }>("/shelf/:agentId/ask", async (req, reply) => {
    const agent = AGENTS[req.params.agentId as AgentDomain];
    if (!agent) return reply.code(404).send({ error: "unknown agent" });
    const body = askBody.safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "invalid body", issues: body.error.issues });
    const gate = allowAsk();
    if (!gate.ok) return reply.code(429).header("retry-after", String(gate.retryAfterSec)).send({ error: "too many questions, try again later" });
    const tier: TierId = body.data.tier;
    try {
      const out = await deps.llm.complete({ system: systemFor(agent, tier), user: body.data.question, maxTokens: TIERS[tier].maxTokens });
      const res: AskResponse = {
        agent: agent.id,
        tier,
        answer: out.text,
        provider: deps.llm.provider,
        model: out.model,
        real: deps.llm.provider !== "mock",
        promptHash: promptHashOf(agent, tier),
      };
      return res;
    } catch (e) {
      if (e instanceof LlmError) return reply.code(502).send({ error: e.message });
      throw e;
    }
  });

  app.get<{ Params: { agentId: string; tier: string } }>("/shelf/:agentId/receipt/:tier", async (req, reply) => {
    const agent = AGENTS[req.params.agentId as AgentDomain];
    const tier = req.params.tier as TierId;
    const stored = agent && TIER_IDS.includes(tier) ? deps.scores.get(agent.id, tier) : null;
    if (!stored) return reply.code(404).send({ error: "no score for that agent and tier" });
    return { receipt: stored.score.receipt, input: stored.input, recomputed: receiptOf(stored.input), matches: receiptOf(stored.input) === stored.score.receipt };
  });
}
