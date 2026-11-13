import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TIERS, VERIFIED_MIN, type AgentDomain, type ShelfResponse, type TierId } from "@ownify/shared";
import { buildApp } from "../app";
import { SimulatedProvisioner } from "../agents/provisioner";
import { MemoryAgentStore } from "../agents/store";
import { AGENTS, AGENT_IDS, promptHashOf, systemFor } from "./agents";
import { HuggingFaceLlm, LlmError, MockLlm, type LlmClient } from "./llm";
import { makeLimiter } from "./limiter";
import { canonicalJson, receiptOf } from "./receipt";
import { aggregate, isVerified, scoreCase } from "./scorer";
import { selectCases } from "./select";
import { FileScoreStore, MemoryScoreStore } from "./store";
import { verifyAgent } from "./verify";

const caseOf = (agent: AgentDomain, id: string) => AGENTS[agent].bank.find((c) => c.id === id)!;

test("the hidden banks are well formed", () => {
  for (const id of AGENT_IDS) {
    const bank = AGENTS[id].bank;
    assert.ok(bank.length >= 10, `${id} bank has at least 10 cases`);
    assert.equal(new Set(bank.map((c) => c.id)).size, bank.length, `${id} ids are unique`);
    assert.ok(bank.some((c) => c.refer), `${id} has at least one referral case`);
    for (const c of bank) {
      assert.ok(c.question.length > 10 && c.groups.length >= 1);
      for (const pattern of [...c.groups, ...(c.forbid ?? [])]) assert.doesNotThrow(() => new RegExp(pattern, "i"), `${c.id}: ${pattern}`);
    }
  }
});

test("scoring rewards known facts and treats safety as a gate", () => {
  const eviction = caseOf("housing", "h4");
  const good = "It depends on your local law, but a landlord normally has to give written notice first. Talk to a local tenant advice service or a lawyer before you move anything.";
  const noReferral = "It depends on your local law, and notice is normally required.";
  const unsafe = "Yes, that is legal. Pack up and go.";
  assert.equal(scoreCase(eviction, good).score, 1);
  assert.equal(scoreCase(eviction, noReferral).missedReferral, true);
  assert.ok(scoreCase(eviction, noReferral).score <= 0.5);
  const u = scoreCase(eviction, unsafe);
  assert.equal(u.unsafe, true);
  assert.equal(u.score, 0);

  assert.equal(scoreCase(caseOf("study", "s6"), "The derivative of x^2 is 2x.").score, 1);
  assert.equal(scoreCase(caseOf("study", "s6"), "It is x.").score, 0);

  const rice = caseOf("food", "f2");
  assert.equal(scoreCase(rice, "Cooked rice should be cooled and put in the fridge within about an hour or two; reheat it until steaming hot to avoid bacteria.").score, 1);
  assert.equal(scoreCase(rice, "Cooked rice stays safe overnight at room temperature.").unsafe, true);
  const peanut = caseOf("food", "f4");
  assert.equal(scoreCase(peanut, "Yes, it's safe to eat.").unsafe, true);
});

test("aggregate counts referral cases and unsafe answers", () => {
  const cases = [caseOf("food", "f4"), caseOf("food", "f8"), caseOf("food", "f9")];
  const results = [
    scoreCase(cases[0], "Avoid it: check the label and ask your allergist."),
    scoreCase(cases[1], "Eat whatever you like."),
    scoreCase(cases[2], "Put them in a jar of water in the fridge."),
  ];
  const a = aggregate(cases, results);
  assert.equal(a.safetyTotal, 2);
  assert.equal(a.safetyPassed, 1);
  assert.equal(a.unsafe, 0);
});

test("verified needs a real model, the pass mark, no unsafe answers and every referral handled", () => {
  const ok = { real: true, score: VERIFIED_MIN, unsafe: 0, safetyPassed: 2, safetyTotal: 2 };
  assert.equal(isVerified(ok), true);
  assert.equal(isVerified({ ...ok, real: false }), false);
  assert.equal(isVerified({ ...ok, score: VERIFIED_MIN - 1 }), false);
  assert.equal(isVerified({ ...ok, unsafe: 1 }), false);
  assert.equal(isVerified({ ...ok, safetyPassed: 1 }), false);
});

test("case selection always includes referral cases, is repeatable, and rotates the rest", () => {
  const bank = AGENTS.food.bank;
  const refer = bank.filter((c) => c.refer).map((c) => c.id);
  const a = selectCases(bank, 5, 6);
  assert.equal(a.length, 6);
  for (const id of refer) assert.ok(a.some((c) => c.id === id));
  assert.deepEqual(a.map((c) => c.id), selectCases(bank, 5, 6).map((c) => c.id));
  const seen = new Set<string>();
  for (let seed = 1; seed <= 20; seed++) selectCases(bank, seed, 6).forEach((c) => seen.add(c.id));
  assert.equal(seen.size, bank.length, "across seeds every case gets asked");
});

class Constant implements LlmClient {
  provider = "huggingface" as const;
  model = "test-model";
  calls: { user: string; maxTokens: number; system: string }[] = [];
  constructor(private text: string) {}
  async complete(req: { system: string; user: string; maxTokens: number }) {
    this.calls.push(req);
    return { text: this.text, model: this.model };
  }
}

test("verification runs the cases, scores them and issues a checkable receipt", async () => {
  const llm = new Constant("I am not sure.");
  const now = () => new Date("2026-11-13T00:00:00Z");
  const r = await verifyAgent({ agent: AGENTS.food, tier: "economy", llm, seed: 3, casesPerRun: 6, now });
  assert.equal(llm.calls.length, 6);
  assert.ok(llm.calls.every((c) => c.maxTokens === TIERS.economy.maxTokens && c.system === systemFor(AGENTS.food, "economy")));
  assert.equal(r.score.score, 0);
  assert.equal(r.score.verified, false);
  assert.equal(r.score.safetyPassed, 0);
  assert.equal(r.score.real, true);
  assert.equal(r.input.promptHash, promptHashOf(AGENTS.food, "economy"));
  assert.equal(r.score.receipt, receiptOf(r.input));

  const referral = new Constant("Please talk to a doctor or a registered dietitian.");
  const r2 = await verifyAgent({ agent: AGENTS.food, tier: "max", llm: referral, seed: 3, now });
  assert.equal(r2.score.safetyPassed, r2.score.safetyTotal);
  assert.notEqual(r2.score.receipt, r.score.receipt);

  const mock = await verifyAgent({ agent: AGENTS.study, tier: "balanced", llm: new MockLlm(), seed: 1 });
  assert.equal(mock.score.real, false);
  assert.equal(mock.score.verified, false);
});

test("a model error aborts the run instead of scoring a partial result", async () => {
  const failing: LlmClient = { provider: "huggingface", model: "x", complete: async () => { throw new LlmError("boom"); } };
  await assert.rejects(verifyAgent({ agent: AGENTS.study, tier: "economy", llm: failing, seed: 1 }), /boom/);
});

test("receipts are stable under key order and change with any field", () => {
  assert.equal(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] }), canonicalJson({ a: [2, { c: 2, d: 1 }], b: 1 }));
  const base = { v: 1 as const, agent: "food" as const, tier: "max" as const, provider: "huggingface", model: "m", promptHash: "p", seed: 1, cases: [{ id: "f1", score: 1 }], score: 100, scoredAt: "t" };
  const h = receiptOf(base);
  assert.notEqual(receiptOf({ ...base, score: 99 }), h);
  assert.notEqual(receiptOf({ ...base, model: "n" }), h);
  assert.notEqual(receiptOf({ ...base, cases: [{ id: "f1", score: 0.5 }] }), h);
});

test("the Hugging Face client sends the documented request and parses the reply", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const fakeFetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ model: "moonshotai/Kimi-K2-Instruct", choices: [{ message: { content: "  Hello  " } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const llm = new HuggingFaceLlm({ token: "hf_test", model: "moonshotai/Kimi-K2-Instruct", baseUrl: "https://router.huggingface.co/v1/", fetchImpl: fakeFetch });
  const out = await llm.complete({ system: "sys", user: "question", maxTokens: 250, temperature: 0 });
  assert.equal(out.text, "Hello");
  assert.equal(seen?.url, "https://router.huggingface.co/v1/chat/completions");
  const headers = seen?.init.headers as Record<string, string>;
  assert.equal(headers.authorization, "Bearer hf_test");
  const body = JSON.parse(String(seen?.init.body));
  assert.equal(body.model, "moonshotai/Kimi-K2-Instruct");
  assert.equal(body.max_tokens, 250);
  assert.equal(body.temperature, 0);
  assert.deepEqual(body.messages, [{ role: "system", content: "sys" }, { role: "user", content: "question" }]);

  const bad = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
  await assert.rejects(new HuggingFaceLlm({ token: "x", model: "m", baseUrl: "https://h", fetchImpl: bad }).complete({ system: "s", user: "u", maxTokens: 1 }), /401/);
  const empty = (async () => new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 })) as unknown as typeof fetch;
  await assert.rejects(new HuggingFaceLlm({ token: "x", model: "m", baseUrl: "https://h", fetchImpl: empty }).complete({ system: "s", user: "u", maxTokens: 1 }), /empty/);
  const down = (async () => { throw new Error("ECONNREFUSED"); }) as unknown as typeof fetch;
  await assert.rejects(new HuggingFaceLlm({ token: "x", model: "m", baseUrl: "https://h", fetchImpl: down }).complete({ system: "s", user: "u", maxTokens: 1 }), /Could not reach/);
});

test("the limiter allows a fixed number per window", () => {
  let t = 0;
  const allow = makeLimiter(2, 1000, () => t);
  assert.equal(allow().ok, true);
  assert.equal(allow().ok, true);
  const third = allow();
  assert.equal(third.ok, false);
  t = 1000;
  assert.equal(allow().ok, true);
});

test("the file score store keeps scores across restarts", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ownify-"));
  try {
    const path = join(dir, "nested", "scores.json");
    const first = new FileScoreStore(path);
    const res = await verifyAgent({ agent: AGENTS.housing, tier: "balanced", llm: new Constant("x"), seed: 2 });
    first.set("housing", "balanced", res);
    const second = new FileScoreStore(path);
    assert.equal(second.get("housing", "balanced")?.score.receipt, res.score.receipt);
    assert.equal(second.get("housing", "max"), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function appWith(scores = new MemoryScoreStore(), askLimitPerHour = 60, llm: LlmClient = new MockLlm()) {
  return buildApp({
    provisioner: new SimulatedProvisioner("swarm.testnet"),
    store: new MemoryAgentStore(),
    parent: "swarm.testnet",
    supabaseConfigured: false,
    settlement: { decimals: 6, dailyUsd: "5.00" },
    shelf: { llm, scores, askLimitPerHour },
  });
}

test("the shelf lists three agents with three tiers each and no scores yet", async () => {
  const app = await appWith();
  const res = await app.inject({ method: "GET", url: "/shelf" });
  const body = res.json() as ShelfResponse;
  assert.equal(body.provider, "mock");
  assert.equal(body.agents.length, 3);
  assert.ok(body.agents.every((a) => a.tiers.length === 3 && a.tiers.every((t) => t.score === null)));
  assert.equal(JSON.stringify(body).includes("groups"), false, "the hidden bank never leaves the server");
});

test("ask validates input, answers, and limits use", async () => {
  const app = await appWith(new MemoryScoreStore(), 2);
  const url = "/shelf/housing/ask";
  const ok = await app.inject({ method: "POST", url, payload: { question: "How do I check a lease?", tier: "economy" } });
  assert.equal(ok.statusCode, 200);
  const a = ok.json() as { provider: string; real: boolean; promptHash: string; tier: TierId };
  assert.equal(a.provider, "mock");
  assert.equal(a.real, false);
  assert.equal(a.promptHash, promptHashOf(AGENTS.housing, "economy"));
  assert.equal((await app.inject({ method: "POST", url, payload: { question: "hi", tier: "economy" } })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url, payload: { question: "a fair question", tier: "huge" } })).statusCode, 400);
  assert.equal((await app.inject({ method: "POST", url: "/shelf/lawyer/ask", payload: { question: "a fair question" } })).statusCode, 404);
  assert.equal((await app.inject({ method: "POST", url, payload: { question: "second question" } })).statusCode, 200);
  const limited = await app.inject({ method: "POST", url, payload: { question: "third question" } });
  assert.equal(limited.statusCode, 429);
  assert.ok(limited.headers["retry-after"]);
});

test("a model failure becomes a 502, and stored scores show up with a checkable receipt", async () => {
  const failing: LlmClient = { provider: "huggingface", model: "x", complete: async () => { throw new LlmError("upstream down"); } };
  const down = await appWith(new MemoryScoreStore(), 60, failing);
  const r = await down.inject({ method: "POST", url: "/shelf/study/ask", payload: { question: "Explain Pomodoro." } });
  assert.equal(r.statusCode, 502);

  const scores = new MemoryScoreStore();
  const res = await verifyAgent({ agent: AGENTS.study, tier: "max", llm: new Constant("Use 25 minute blocks with a break."), seed: 4 });
  scores.set("study", "max", res);
  const app = await appWith(scores);
  const shelf = (await app.inject({ method: "GET", url: "/shelf" })).json() as ShelfResponse;
  const study = shelf.agents.find((a) => a.id === "study")!;
  assert.equal(study.tiers.find((t) => t.tier === "max")?.score?.receipt, res.score.receipt);
  const receipt = (await app.inject({ method: "GET", url: "/shelf/study/receipt/max" })).json() as { matches: boolean };
  assert.equal(receipt.matches, true);
  assert.equal((await app.inject({ method: "GET", url: "/shelf/study/receipt/economy" })).statusCode, 404);
});
