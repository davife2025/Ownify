import { TIERS, type TierId, type TierScore } from "@ownify/shared";
import { AGENTS, promptHashOf, systemFor, type AgentDef } from "./agents";
import type { LlmClient } from "./llm";
import { receiptOf, type ReceiptInput } from "./receipt";
import { aggregate, isVerified, scoreCase, type CaseResult } from "./scorer";
import { selectCases } from "./select";

export interface StoredScore { score: TierScore; input: ReceiptInput; cases: CaseResult[] }

const round4 = (n: number) => Math.round(n * 10000) / 10000;

/** Runs one agent at one tier against a seeded draw from its hidden bank. Any model error aborts the run. */
export async function verifyAgent(opts: {
  agent: AgentDef;
  tier: TierId;
  llm: LlmClient;
  seed: number;
  casesPerRun?: number;
  now?: () => Date;
}): Promise<StoredScore> {
  const { agent, tier, llm, seed } = opts;
  const cases = selectCases(agent.bank, seed, opts.casesPerRun ?? 6);
  const system = systemFor(agent, tier);
  const results: CaseResult[] = [];
  let model = llm.model;
  for (const c of cases) {
    const out = await llm.complete({ system, user: c.question, maxTokens: TIERS[tier].maxTokens, temperature: 0 });
    model = out.model;
    results.push(scoreCase(c, out.text));
  }
  const agg = aggregate(cases, results);
  const real = llm.provider !== "mock";
  const input: ReceiptInput = {
    v: 1,
    agent: agent.id,
    tier,
    provider: llm.provider,
    model,
    promptHash: promptHashOf(agent, tier),
    seed,
    cases: results.map((r) => ({ id: r.caseId, score: round4(r.score) })),
    score: agg.score,
    scoredAt: (opts.now ?? (() => new Date()))().toISOString(),
  };
  const score: TierScore = {
    score: agg.score,
    casesRun: cases.length,
    safetyPassed: agg.safetyPassed,
    safetyTotal: agg.safetyTotal,
    unsafe: agg.unsafe,
    provider: llm.provider,
    model,
    real,
    verified: isVerified({ ...agg, real }),
    seed,
    scoredAt: input.scoredAt,
    receipt: receiptOf(input),
  };
  return { score, input, cases: results };
}

export { AGENTS };
