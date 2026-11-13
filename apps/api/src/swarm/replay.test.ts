import test from "node:test";
import assert from "node:assert/strict";
import { describeEvent, reduceRoundEvents, shortId, usd } from "@ownify/shared";
import { runSimulation } from "./simulation";

test("formatting helpers", () => {
  assert.equal(shortId("buyer-3.swarm.testnet"), "buyer-3");
  assert.equal(usd(2_906_664), "$2.91");
  assert.equal(usd(790_612_608), "$790.61");
});

test("replaying a round's public events rebuilds its record", () => {
  for (const seed of [1, 2, 3, 11]) {
    const run = runSimulation({ seed, rounds: 4, buyers: 20, sellers: 5, parent: "swarm.testnet" });
    for (const r of run.rounds) {
      const v = reduceRoundEvents(run.events.filter((e) => e.round === r.index));
      assert.equal(v.phase, "closed");
      assert.deepEqual(v.offers, r.offers.map(({ sellerId, price, capacity }) => ({ sellerId, price, capacity })));
      assert.deepEqual(v.voidedOffers, r.voidedOffers);
      assert.deepEqual(v.voidedDemands, r.voidedDemands);
      assert.deepEqual(v.settlements, r.settlements);
      assert.deepEqual(v.defaults, r.defaults);
      assert.equal(v.demandsReceived, r.demands.length + r.voidedDemands.length);
      assert.equal(v.poolHours, r.demands.reduce((s, d) => s + d.hours, 0));
      const res = r.result;
      if (res?.status === "cleared") {
        assert.equal(v.cleared?.winner, res.winner);
        assert.equal(v.cleared?.price, res.price);
        assert.equal(v.cleared?.payout, res.payout);
        assert.deepEqual(v.cleared?.allocations, res.allocations);
      } else {
        assert.equal(v.failedReason, res?.status === "failed" ? res.reason : null);
      }
    }
  }
});

test("a partial replay shows only what has happened so far", () => {
  const run = runSimulation({ seed: 1, rounds: 1, buyers: 20, sellers: 5, parent: "swarm.testnet" });
  const evs = run.events.filter((e) => e.round === 1);
  const lockAt = evs.findIndex((e) => e.type === "poolLocked");
  const early = reduceRoundEvents(evs.slice(0, lockAt));
  assert.equal(early.poolHours, null);
  assert.equal(early.cleared, null);
  assert.equal(early.offers.length, 0);
  const revealAt = evs.findIndex((e) => e.type === "revealOpened");
  assert.equal(reduceRoundEvents(evs.slice(0, revealAt)).commitments, 5);
});

test("every event type reads as a clean sentence", () => {
  const run = runSimulation({ seed: 2, rounds: 5, buyers: 20, sellers: 5, parent: "swarm.testnet" });
  const seen = new Set<string>();
  for (const e of run.events) {
    seen.add(e.type);
    const line = describeEvent(e);
    assert.ok(line.length > 8);
    assert.equal(/undefined|NaN|\[object/.test(line), false, line);
  }
  for (const t of ["roundOpened", "demandSubmitted", "poolLocked", "bidCommitted", "revealOpened", "offerRevealed", "roundCleared", "settlementRecorded", "roundClosed"]) {
    assert.ok(seen.has(t), `simulation should produce ${t}`);
  }
});
