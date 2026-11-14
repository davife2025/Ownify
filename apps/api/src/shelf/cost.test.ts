import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COMPUTE_IDS, DEFAULT_RATE_CARD, TIERS, approxTokens, costUsd, quote, usdFine,
  type AskResponse, type PricingResponse, type RateCard, type TaskReceipt,
} from "@ownify/shared";
import { buildApp } from "../app";
import { SimulatedProvisioner } from "../agents/provisioner";
import { MemoryAgentStore } from "../agents/store";
import { HuggingFaceLlm, MockLlm, type LlmClient, type LlmRequest } from "./llm";
import { rateCardFromEnv } from "./rates";
import { FileReceiptStore, MemoryReceiptStore } from "./receiptStore";
import { MemoryScoreStore } from "./store";
import { buildReceipt, receiptMatches } from "./taskReceipt";

test("token and cost math", () => {
  assert.equal(approxTokens("abcd"), 1);
  assert.equal(approxTokens("abcde"), 2);
  assert.equal(costUsd(1000, 500, { inputPerMTok: 1, outputPerMTok: 3 }), 0.0025);
  assert.equal(usdFine(0.00071), "$0.0007");
  assert.equal(usdFine(0.5), "$0.50");
  assert.equal(usdFine(0.00001), "<$0.0001");
});

test("stepping the answer budget down lowers the price ceiling", () => {
  const q = (tier: "economy" | "balanced" | "max", compute: "fastest" | "cheapest", card: RateCard = DEFAULT_RATE_CARD) =>
    quote({ systemTokens: 120, question: "How do I check a lease?", tier, compute, card });
  assert.ok(q("economy", "fastest").maxCostUsd < q("balanced", "fastest").maxCostUsd);
  assert.ok(q("balanced", "fastest").maxCostUsd < q("max", "fastest").maxCostUsd);
  assert.equal(q("max", "fastest").maxOutputTokens, TIERS.max.maxTokens);

  const unknown = q("max", "cheapest");
  assert.equal(unknown.cheaperRateKnown, false);
  assert.equal(unknown.maxCostUsd, q("max", "fastest").maxCostUsd, "without cheaper rates the standard rates are used");
  const card: RateCard = { ...DEFAULT_RATE_CARD, cheapest: { inputPerMTok: 0.5, outputPerMTok: 1.5 } };
  assert.equal(q("max", "cheapest", card).cheaperRateKnown, true);
  assert.ok(q("max", "cheapest", card).maxCostUsd < q("max", "fastest", card).maxCostUsd);
});

test("the rate card comes from settings, and half-set pairs are ignored", () => {
  assert.deepEqual(rateCardFromEnv({}), DEFAULT_RATE_CARD);
  const set = rateCardFromEnv({ PRICE_INPUT_USD_PER_MTOK: 2, PRICE_OUTPUT_USD_PER_MTOK: 6, PRICE_CHEAPEST_INPUT_USD_PER_MTOK: 1, PRICE_CHEAPEST_OUTPUT_USD_PER_MTOK: 3 });
  assert.equal(set.source, "configured");
  assert.deepEqual(set.fastest, { inputPerMTok: 2, outputPerMTok: 6 });
  assert.deepEqual(set.cheapest, { inputPerMTok: 1, outputPerMTok: 3 });
  const half = rateCardFromEnv({ PRICE_INPUT_USD_PER_MTOK: 2, PRICE_CHEAPEST_INPUT_USD_PER_MTOK: 1 });
  assert.equal(half.source, "reference");
  assert.equal(half.cheapest, null);
});

const body = {
  v: 1 as const, at: "2026-11-13T00:00:00Z", agent: "food" as const, tier: "economy" as const, compute: "fastest" as const,
  provider: "huggingface" as const, real: true, modelRequested: "m", modelServed: "m", promptHash: "p", questionHash: "q",
  inputTokens: 100, outputTokens: 50, tokensSource: "reported" as const, latencyMs: 900,
  rates: { inputPerMTok: 1, outputPerMTok: 3 }, rateSource: "reference" as const, costUsd: 0.00025,
};

test("a task receipt detects any tampering", () => {
  const r = buildReceipt(body);
  assert.equal(receiptMatches(r), true);
  assert.equal(r.id, r.receiptHash.slice(0, 16));
  assert.equal(receiptMatches({ ...r, costUsd: 0 }), false);
  assert.equal(receiptMatches({ ...r, outputTokens: 1 }), false);
  assert.equal(receiptMatches({ ...r, id: "0000000000000000" }), false);
});

test("the Hugging Face client asks for the cheapest provider and reports token use", async () => {
  const bodies: { model: string }[] = [];
  const fake = (async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ model: "moonshotai/Kimi-K2-Instruct", choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 120, completion_tokens: 45 } }), { status: 200 });
  }) as unknown as typeof fetch;
  const llm = new HuggingFaceLlm({ token: "t", model: "moonshotai/Kimi-K2-Instruct", baseUrl: "https://router.huggingface.co/v1", fetchImpl: fake });
  const cheap = await llm.complete({ system: "s", user: "u", maxTokens: 10, compute: "cheapest" });
  const fast = await llm.complete({ system: "s", user: "u", maxTokens: 10, compute: "fastest" });
  assert.equal(bodies[0].model, "moonshotai/Kimi-K2-Instruct:cheapest");
  assert.equal(bodies[1].model, "moonshotai/Kimi-K2-Instruct", "fastest is Hugging Face's default, so no suffix");
  assert.deepEqual(cheap.usage, { inputTokens: 120, outputTokens: 45 });
  assert.equal(llm.modelFor("cheapest"), "moonshotai/Kimi-K2-Instruct:cheapest");

  const noUsage = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 })) as unknown as typeof fetch;
  const out = await new HuggingFaceLlm({ token: "t", model: "m", baseUrl: "https://h", fetchImpl: noUsage }).complete({ system: "s", user: "u", maxTokens: 1 });
  assert.equal(out.usage, undefined);
});

class Spy implements LlmClient {
  provider = "huggingface" as const;
  model = "kimi";
  seen: LlmRequest[] = [];
  constructor(private usage?: { inputTokens: number; outputTokens: number }) {}
  modelFor(c?: "fastest" | "cheapest") { return c === "cheapest" ? "kimi:cheapest" : "kimi"; }
  async complete(req: LlmRequest) {
    this.seen.push(req);
    return { text: "A short answer.", model: "kimi-served", usage: this.usage };
  }
}

function appWith(llm: LlmClient, rates?: RateCard, receipts = new MemoryReceiptStore()) {
  return buildApp({
    provisioner: new SimulatedProvisioner("swarm.testnet"),
    store: new MemoryAgentStore(),
    parent: "swarm.testnet",
    supabaseConfigured: false,
    settlement: { decimals: 6, dailyUsd: "5.00" },
    shelf: { llm, scores: new MemoryScoreStore(), askLimitPerHour: 100, rates, receipts },
  });
}

test("asking returns a receipt with real token counts, the right cost, and no question text", async () => {
  const llm = new Spy({ inputTokens: 200, outputTokens: 100 });
  const rates: RateCard = { fastest: { inputPerMTok: 2, outputPerMTok: 6 }, cheapest: { inputPerMTok: 1, outputPerMTok: 3 }, source: "configured" };
  const app = await appWith(llm, rates);
  const question = "Is my secret landlord arrangement legal?";

  const res = await app.inject({ method: "POST", url: "/shelf/housing/ask", payload: { question, tier: "economy", compute: "cheapest" } });
  assert.equal(res.statusCode, 200);
  const out = res.json() as AskResponse;
  assert.equal(llm.seen[0].compute, "cheapest");
  assert.equal(llm.seen[0].maxTokens, TIERS.economy.maxTokens);
  const r = out.receipt;
  assert.equal(r.tokensSource, "reported");
  assert.equal(r.inputTokens, 200);
  assert.equal(r.outputTokens, 100);
  assert.equal(r.costUsd, costUsd(200, 100, rates.cheapest!));
  assert.equal(r.modelRequested, "kimi:cheapest");
  assert.equal(r.modelServed, "kimi-served");
  assert.equal(r.rateSource, "configured");

  const fetched = (await app.inject({ method: "GET", url: `/receipts/${r.id}` })).json() as { receipt: TaskReceipt; matches: boolean };
  assert.equal(fetched.matches, true);
  const raw = JSON.stringify(fetched);
  assert.equal(raw.includes("landlord"), false, "receipts never hold the question");
  assert.equal(raw.includes("A short answer"), false, "receipts never hold the answer");
  assert.equal((await app.inject({ method: "GET", url: "/receipts/nope" })).statusCode, 404);
});

test("without reported usage the tokens are estimated and labelled, and mock receipts are not real", async () => {
  const noUsage = await appWith(new Spy());
  const a = (await noUsage.inject({ method: "POST", url: "/shelf/study/ask", payload: { question: "Explain Pomodoro." } })).json() as AskResponse;
  assert.equal(a.receipt.tokensSource, "estimated");
  assert.equal(a.compute, "fastest");
  assert.equal(a.receipt.rateSource, "reference");

  const mock = await appWith(new MockLlm());
  const m = (await mock.inject({ method: "POST", url: "/shelf/study/ask", payload: { question: "Explain Pomodoro." } })).json() as AskResponse;
  assert.equal(m.receipt.real, false);
  assert.equal(m.receipt.provider, "mock");

  assert.equal((await mock.inject({ method: "POST", url: "/shelf/study/ask", payload: { question: "Explain Pomodoro.", compute: "turbo" } })).statusCode, 400);
});

test("receipts list newest first and the pricing route shows rates and prompt sizes", async () => {
  const app = await appWith(new Spy({ inputTokens: 10, outputTokens: 5 }));
  for (const q of ["first question", "second question", "third question"]) {
    await app.inject({ method: "POST", url: "/shelf/food/ask", payload: { question: q, tier: "economy" } });
  }
  const list = (await app.inject({ method: "GET", url: "/receipts?limit=2" })).json() as { receipts: TaskReceipt[] };
  assert.equal(list.receipts.length, 2);
  assert.ok(list.receipts[0].at >= list.receipts[1].at);

  const p = (await app.inject({ method: "GET", url: "/pricing" })).json() as PricingResponse;
  assert.equal(p.rates.source, "reference");
  assert.equal(p.energy.measured, false);
  for (const agent of ["housing", "study", "food"] as const) {
    for (const tier of ["economy", "balanced", "max"] as const) assert.ok(p.systemTokens[agent][tier] > 20);
  }
  assert.ok(COMPUTE_IDS.length === 2);
});

test("the receipt file store keeps the latest 200 across restarts", () => {
  const dir = mkdtempSync(join(tmpdir(), "ownify-r-"));
  try {
    const path = join(dir, "x", "receipts.json");
    const first = new FileReceiptStore(path);
    for (let i = 0; i < 205; i++) first.add(buildReceipt({ ...body, at: `2026-11-13T00:00:${String(i).padStart(3, "0")}Z`, latencyMs: i }));
    const second = new FileReceiptStore(path);
    assert.equal(second.list(500).length, 200);
    assert.equal(second.list(1)[0].latencyMs, 204);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
