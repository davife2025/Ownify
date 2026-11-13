import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { runSimulation } from "./simulation";

const cfg = { rounds: 4, buyers: 20, sellers: 5, parent: "swarm.testnet" };

test("same seed gives the same market, a different seed gives a different one", () => {
  const a = JSON.stringify(runSimulation({ seed: 7, ...cfg }));
  assert.equal(JSON.stringify(runSimulation({ seed: 7, ...cfg })), a);
  assert.notEqual(JSON.stringify(runSimulation({ seed: 8, ...cfg })), a);
});

test("runs 20 buyers and 5 sellers named under the parent account", () => {
  const run = runSimulation({ seed: 1, ...cfg });
  assert.equal(run.rounds.length, 4);
  const ids = new Set(run.events.flatMap((e) => [e.data.buyerId, e.data.sellerId]).filter(Boolean));
  assert.ok(ids.has("buyer-1.swarm.testnet"));
  assert.ok(ids.has("seller-5.swarm.testnet"));
  assert.ok([...ids].every((id) => /^(buyer|seller)-\d+\.swarm\.testnet$/.test(String(id))));
});

test("rules hold in every round across many seeds", () => {
  let cleared = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const run = runSimulation({ seed, ...cfg });
    const sum = (m: Record<string, number>) => Object.values(m).reduce((s, n) => s + n, 0);
    assert.equal(sum(run.finalBalances), sum(run.initialBalances), `money conserved, seed ${seed}`);
    for (const r of run.rounds) {
      const res = r.result;
      if (res?.status !== "cleared") continue;
      cleared++;
      const maxByBuyer = new Map(r.demands.map((dm) => [dm.buyerId, dm.maxPrice]));
      for (const a of res.allocations) assert.ok((maxByBuyer.get(a.buyerId) ?? 0) >= res.price, "buyer never pays above its max");
      const eligible = r.offers.filter((of) => of.capacity >= res.totalHours);
      const winnerOffer = eligible.find((of) => of.sellerId === res.winner)!;
      assert.ok(eligible.every((of) => of.price >= winnerOffer.price), "no cheaper eligible offer");
      assert.ok(res.price >= winnerOffer.price);
      assert.equal(res.payout, res.price * res.totalHours);
      assert.equal(res.allocations.reduce((s, a) => s + a.pays, 0), res.payout);
    }
  }
  assert.ok(cleared > 40, "most rounds should clear");
});

test("simulation code makes no network or LLM calls", () => {
  const dir = __dirname;
  const files = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const f of files) {
    const src = readFileSync(join(dir, f), "utf8");
    assert.equal(/\bfetch\(|https?:\/\/|anthropic|huggingface|openai|node:http|node:net/i.test(src), false, `${f} must stay offline`);
  }
});
