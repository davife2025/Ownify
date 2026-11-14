import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  COMPUTE_IDS, DEFAULT_RATE_CARD, TIERS, TIER_IDS, VERIFIED_MIN, approxTokens, costUsd, ratesFor,
  type AgentDomain, type AskResponse, type PricingResponse, type ShelfResponse, type TierId,
} from "@ownify/shared";
import { AGENTS, AGENT_IDS, promptHashOf, systemFor } from "./agents";
import { LlmError, type LlmClient } from "./llm";
import { makeLimiter } from "./limiter";
import { receiptOf } from "./receipt";
import { MemoryReceiptStore, type ReceiptStore } from "./receiptStore";
import type { ScoreStore } from "./store";
import { buildReceipt, receiptMatches, sha256 } from "./taskReceipt";
import type { RateCard } from "@ownify/shared";

export interface ShelfDeps {
  llm: LlmClient;
  scores: ScoreStore;
  askLimitPerHour: number;
  rates?: RateCard;
  receipts?: ReceiptStore;
}

const askBody = z.object({
  question: z.string().trim().min(3).max(800),
  tier: z.enum(TIER_IDS).default("balanced"),
  compute: z.enum(COMPUTE_IDS).default("fastest"),
});

export function registerShelfRoutes(app: FastifyInstance, deps: ShelfDeps) {
  const allowAsk = makeLimiter(deps.askLimitPerHour, 3_600_000);
  const rates = deps.rates ?? DEFAULT_RATE_CARD;
  const receipts = deps.receipts ?? new MemoryReceiptStore();

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

  app.get("/pricing", async (): Promise<PricingResponse> => ({
    rates,
    systemTokens: Object.fromEntries(
      AGENT_IDS.map((id) => [id, Object.fromEntries(TIER_IDS.map((t) => [t, approxTokens(systemFor(AGENTS[id], t))]))]),
    ) as PricingResponse["systemTokens"],
    energy: { measured: false },
  }));

  app.post<{ Params: { agentId: string } }>("/shelf/:agentId/ask", async (req, reply) => {
    const agent = AGENTS[req.params.agentId as AgentDomain];
    if (!agent) return reply.code(404).send({ error: "unknown agent" });
    const body = askBody.safeParse(req.body ?? {});
    if (!body.success) return reply.code(400).send({ error: "invalid body", issues: body.error.issues });
    const gate = allowAsk();
    if (!gate.ok) return reply.code(429).header("retry-after", String(gate.retryAfterSec)).send({ error: "too many questions, try again later" });

    const { question, tier, compute } = body.data;
    const system = systemFor(agent, tier);
    try {
      const started = Date.now();
      const out = await deps.llm.complete({ system, user: question, maxTokens: TIERS[tier].maxTokens, compute });
      const latencyMs = Date.now() - started;
      const reported = out.usage !== undefined;
      const inputTokens = out.usage?.inputTokens ?? approxTokens(system + question);
      const outputTokens = out.usage?.outputTokens ?? approxTokens(out.text);
      const rateSet = ratesFor(rates, compute);
      const real = deps.llm.provider !== "mock";
      const receipt = buildReceipt({
        v: 1,
        at: new Date().toISOString(),
        agent: agent.id,
        tier,
        compute,
        provider: deps.llm.provider,
        real,
        modelRequested: deps.llm.modelFor?.(compute) ?? deps.llm.model,
        modelServed: out.model,
        promptHash: promptHashOf(agent, tier),
        questionHash: sha256(question),
        inputTokens,
        outputTokens,
        tokensSource: reported ? "reported" : "estimated",
        latencyMs,
        rates: rateSet,
        rateSource: rates.source,
        costUsd: costUsd(inputTokens, outputTokens, rateSet),
      });
      receipts.add(receipt);
      const res: AskResponse = {
        agent: agent.id,
        tier,
        compute,
        answer: out.text,
        provider: deps.llm.provider,
        model: out.model,
        real,
        promptHash: receipt.promptHash,
        receipt,
      };
      return res;
    } catch (e) {
      if (e instanceof LlmError) return reply.code(502).send({ error: e.message });
      throw e;
    }
  });

  app.get<{ Params: { id: string } }>("/receipts/:id", async (req, reply) => {
    const receipt = receipts.get(req.params.id);
    if (!receipt) return reply.code(404).send({ error: "unknown receipt" });
    return { receipt, matches: receiptMatches(receipt) };
  });

  app.get<{ Querystring: { limit?: string } }>("/receipts", async (req) => {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    return { receipts: receipts.list(limit) };
  });

  app.get<{ Params: { agentId: string; tier: string } }>("/shelf/:agentId/receipt/:tier", async (req, reply) => {
    const agent = AGENTS[req.params.agentId as AgentDomain];
    const tier = req.params.tier as TierId;
    const stored = agent && TIER_IDS.includes(tier) ? deps.scores.get(agent.id, tier) : null;
    if (!stored) return reply.code(404).send({ error: "no score for that agent and tier" });
    return { receipt: stored.score.receipt, input: stored.input, recomputed: receiptOf(stored.input), matches: receiptOf(stored.input) === stored.score.receipt };
  });
}
